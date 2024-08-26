import { AgnosticAST } from '../ast/angostic-ast';
import { getFileExtension, isFilePath } from '../util/file_util';
import { createLogger } from '../logger/logger';
import {
  type SourceCodeLocation,
  type SourceMap,
} from '../source_mappers/source_map';
import { type AgnosticASTMap } from './agnostic_node';
import { WasmControlFlowGraph } from '../cfg/wasm_cfg';
import { type SourceCFGNode, SourceControlFlowGraph } from '../cfg/source_cfg';
import { getLangConfigFromExtension } from './languages/all_langs';
import { type LanguageConfiguration } from './languages/language_config';
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

  constructor(sourceMap: SourceMap) {
    this.sourceMap = sourceMap;
    this._asts = new Map();
    this._wasmCfg = new WasmControlFlowGraph(sourceMap.wasm);
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

    const allNodes: SourceCFGNode[] = this.sourceCFG?.allNodes() ?? [];
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
    const availableSources: Array<[string, LanguageConfiguration]> = [];
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
  }
}
