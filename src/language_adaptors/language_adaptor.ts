import { AgnosticAST } from '../ast/angostic-ast';
import { getFileExtension, isFilePath } from '../util/file_util';
import { createLogger } from '../logger/logger';
import {
  sourceCodeLocationToString,
  type SourceCodeLocation,
  type SourceMap,
} from '../source_mappers/source_map';
import { type AgnosticNode, type AgnosticASTMap } from './agnostic_node';
import { WasmControlFlowGraph } from '../cfg/wasm_cfg';
import { type SourceCFGNode, SourceControlFlowGraph } from '../cfg/source_cfg';
import { getLangConfigFromExtension } from './all_langs';
import {
  type DebugOperationName,
  type ASTNodeDescription,
  type ASTDebuggableLanguage,
} from './language_config';
import { writeFileSync } from 'fs';

const logger = createLogger('LanguageAdaptor');

export async function constructLanguageAdaptor(
  sourceMap: SourceMap,
): Promise<LanguageAdaptor> {
  const la = new LanguageAdaptor(sourceMap);
  await la.buildComplementaryContext();
  return la;
}

export interface CountMappingJson {
  numberOfMappings: number;
  numberOfAvailableMappings: number;
  numberOfUniqueMappings: number;
  unusedMappings: SourceCodeLocation[];
}

export class LanguageAdaptor {
  public readonly sourceMap: SourceMap;
  private readonly _asts: AgnosticASTMap;
  private readonly _wasmCfg: WasmControlFlowGraph;
  private _srcCfg?: SourceControlFlowGraph;
  private _astDebugOperations: Map<DebugOperationName, SourceCFGNode[]>;

  constructor(sourceMap: SourceMap) {
    this.sourceMap = sourceMap;
    this._asts = new Map();
    this._wasmCfg = new WasmControlFlowGraph(sourceMap.wasm);
    this._astDebugOperations = new Map();
  }

  get asts(): AgnosticASTMap {
    return this._asts;
  }

  get sourceCFG(): SourceControlFlowGraph | undefined {
    return this._srcCfg;
  }

  async buildComplementaryContext(): Promise<void> {
    await this.buildASTS();
    this.buildSourceCFG();
  }

  public unusedMappingsToJSON(ouputFile?: string): string {
    const mappings = this.sourceMap.mappings;
    const availableMappings = mappings.filter((m) => isFilePath(m.source));
    const uniqueMappings: SourceCodeLocation[] = [];
    for (const m of availableMappings) {
      const found = uniqueMappings.find((um) => {
        return (
          um.source === m.source &&
          um.linenr === m.linenr &&
          um.colnr === m.colnr
        );
      });

      if (found === undefined) {
        uniqueMappings.push(m);
      }
    }

    const allNodes: SourceCFGNode[] = this.sourceCFG?.allNodes ?? [];
    const locsWithoutNode: SourceCodeLocation[] = [];
    for (const um of uniqueMappings) {
      const used = allNodes.find((n) => {
        const sl = n.sourceLocation;
        return (
          um.linenr === sl.linenr &&
          um.colnr === sl.colnr &&
          um.source === sl.source
        );
      });

      if (used === undefined) {
        locsWithoutNode.push(um);
      }
    }

    const m: CountMappingJson = {
      numberOfMappings: mappings.length,
      numberOfAvailableMappings: availableMappings.length,
      numberOfUniqueMappings: uniqueMappings.length,
      unusedMappings: locsWithoutNode,
    };

    const c = JSON.stringify(m);
    if (ouputFile !== undefined) {
      writeFileSync(ouputFile, c);
    }

    return c;
  }

  private async buildASTS(): Promise<void> {
    const availableSources: Array<[string, ASTDebuggableLanguage]> = [];
    for (const s of this.sourceMap.sources) {
      if (!isFilePath(s)) {
        logger.debug(
          `Will not create an AST for source file ${s} as such filepath does not exist `,
        );
        continue;
      }

      const ext = getFileExtension(s);
      if (ext === undefined) {
        logger.debug(
          `Will not create an AST for source file ${s} as such filepath has no file extension`,
        );
        continue;
      }
      const conf = getLangConfigFromExtension(ext);
      if (conf === undefined) {
        logger.info(`No parser found for ${s} so will ignore file`);
        continue;
      }
      availableSources.push([s, conf]);
    }

    logger.info(
      `Building AST for #${availableSources.length} available sources out of ${this.sourceMap.sources.length}`,
    );
    for (const [s, langConfig] of availableSources) {
      const ast = new AgnosticAST(s, langConfig);
      logger.debug(`Building AST for ${s} with ${langConfig.language} parser`);
      await ast.buildAST();
      this._asts.set(s, ast);
    }
  }

  private buildSourceCFG(): void {
    this._srcCfg = new SourceControlFlowGraph(
      this._asts,
      this.sourceMap,
      this._wasmCfg,
    );
    this._astDebugOperations = this.seletectASTNodesForDebugOperations(
      this._srcCfg,
      this._asts,
    );
  }

  private seletectASTNodesForDebugOperations(
    scfg: SourceControlFlowGraph,
    asts: AgnosticASTMap,
  ): Map<DebugOperationName, SourceCFGNode[]> {
    const m = new Map<DebugOperationName, SourceCFGNode[]>();
    for (const cfgNode of scfg.allNodes) {
      if (cfgNode.node === undefined) {
        continue;
      }

      const ast = asts.get(cfgNode.sourceLocation.source);
      if (ast === undefined) {
        throw new Error(
          `AST for node with loc ${sourceCodeLocationToString(cfgNode.sourceLocation)} should not be null as Node has ASTNode`,
        );
      }

      for (const debugOp of ast.targetLanguage.astDebugOperations) {
        if (
          !this.doesNodeStatisfyDescription(
            cfgNode.node,
            debugOp.astNodeDescription,
          )
        ) {
          continue;
        }
        let ns = m.get(debugOp.debugOperation);
        if (ns === undefined) {
          ns = [];
        }
        ns.push(cfgNode);
        m.set(debugOp.debugOperation, ns);
      }
    }
    return m;
  }

  private doesNodeStatisfyDescription(
    n: AgnosticNode,
    description: ASTNodeDescription,
  ): boolean {
    logger.debug(
      `ASTNode GrammardID='${n.node.grammarId}' GrammarType='${n.node.grammarType}' (rowStart=${n.node.startPosition.row},colStart=${n.node.startPosition.column} rowEnd=${n.node.endPosition.row},colEnd=${n.node.endPosition.column}) txt='${n.node.text.slice(0, 10)}'`,
    );
    return (
      description.grammarID === n.node.grammarId &&
      description.grammarType === n.node.grammarType
    );
  }
}
