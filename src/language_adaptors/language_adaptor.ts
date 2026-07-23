import { AgnosticAST } from '../ast/angostic-ast';
import { getFileExtension, isFilePath } from '../util/file_util';
import { createLogger } from '../logger/logger';
import {
  SourceMap,
  type SourceCodeLocation,
} from '../source_mappers/source_map';
import { type AgnosticASTMap } from './agnostic_node';
import { WasmCFGs } from '../cfg/wasm_cfg';
import { SourceCFGs } from '../cfg/source_cfg';
import { getLangConfigFromExtension } from './languages/all_langs';
import { type LanguageConfiguration } from './languages/language_config';
import { writeFileSync } from 'fs';
import { SourceMapFromJSON } from '../source_mappers/source_map_builder';
import { SourceMapConfig } from '../source_mappers/source_map_config';
import { SourceCFGNode } from '../cfg/source_cfg_node_edge';
import assert from 'assert';
import { WasmModule } from '../webassembly';

const logger = createLogger('LanguageAdaptor');

export async function constructLanguageAdaptor(
  sourceMap: SourceMap | string,
  includeUnavailableSourceFiles: boolean | SourceMapConfig = false,
): Promise<LanguageAdaptor> {
  if (typeof sourceMap === 'string') {
    let c: SourceMapConfig = {};
    if (typeof includeUnavailableSourceFiles === 'boolean') {
      c.relativePaths = includeUnavailableSourceFiles;
    } else {
      c = includeUnavailableSourceFiles;
    }
    const la = LanguageAdaptor.fromMappingsPath(sourceMap, c);
    await la.buildASTS();
    return la;
  } else {
    const include =
      typeof includeUnavailableSourceFiles === 'boolean'
        ? includeUnavailableSourceFiles
        : !!includeUnavailableSourceFiles.relativePaths;
    const la = new LanguageAdaptor(sourceMap);
    await la.buildComplementaryContext(include);
    return la;
  }
}

export interface CountMappingJson {
  numberOfMappings: number;
  numberOfAvailableMappings: number;
  numberOfUniqueMappings: number;
  unusedMappings: SourceCodeLocation[];
  noSuchAddrMappings: SourceCodeLocation[];
}

export class LanguageAdaptor {
  public readonly sourceMap: SourceMap;
  private readonly _asts: AgnosticASTMap;
  private readonly _wasmCFGs?: WasmCFGs;
  private _srcCfg?: SourceCFGs;

  constructor(sourceMap: SourceMap, constructCFGs: boolean = true) {
    this.sourceMap = sourceMap;
    this._asts = new Map();
    if (constructCFGs) {
      this._wasmCFGs = new WasmCFGs(sourceMap.wasm);
    }
  }

  get asts(): AgnosticASTMap {
    return this._asts;
  }

  get sourceCFG(): SourceCFGs | undefined {
    return this._srcCfg;
  }

  get sourceCFGs(): SourceCFGs {
    if (this._srcCfg === undefined) {
      throw new Error(`SourceControlFlowGraphs were not constructed`);
    }
    return this._srcCfg;
  }

  async buildComplementaryContext(
    includeUnavailableSourceFiles: boolean,
  ): Promise<void> {
    await this.buildASTS();
    this.buildSourceCFGs(includeUnavailableSourceFiles);
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

    const unusedMappings: SourceCodeLocation[] = [];
    const noSuchAddrMappings: SourceCodeLocation[] = [];
    for (const l of locsWithoutNode) {
      const instr = this.sourceMap.wasm.getInstruction(l.address);
      if (instr === undefined) {
        noSuchAddrMappings.push(l);
      } else {
        unusedMappings.push(l);
      }
    }

    const m: CountMappingJson = {
      numberOfMappings: mappings.length,
      numberOfAvailableMappings: availableMappings.length,
      numberOfUniqueMappings: uniqueMappings.length,
      unusedMappings,
      noSuchAddrMappings,
    };

    const c = JSON.stringify(m);
    if (ouputFile !== undefined) {
      writeFileSync(ouputFile, c);
    }

    return c;
  }

  public async buildASTS(): Promise<void> {
    const availableSources: Array<[string, LanguageConfiguration]> = [];
    for (const s of this.sourceMap.sources) {
      if (!isFilePath(s)) {
        // logger.debug(
        //   `Will not create an AST for source file ${s} as such filepath does not exist `,
        // );
        continue;
      }

      const ext = getFileExtension(s);
      if (ext === undefined) {
        // logger.debug(
        //   `Will not create an AST for source file ${s} as such filepath has no file extension`,
        // );
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

  private buildSourceCFGs(includeUnavailableSourceFiles: boolean): void {
    assert(
      this._wasmCFGs !== undefined,
      'LanguageAdaptor was constructed without WCFGs',
    );
    this._srcCfg = new SourceCFGs(
      this._asts,
      this.sourceMap,
      this._wasmCFGs,
      includeUnavailableSourceFiles,
    );
  }

  static emptyAdaptor(wasmPath: string | WasmModule): LanguageAdaptor {
    return new LanguageAdaptor(new SourceMap(wasmPath, [], []), false);
  }

  static fromMappingsPath(
    mappingsPath: string,
    config?: SourceMapConfig,
  ): LanguageAdaptor {
    const sm = SourceMapFromJSON(mappingsPath, config);
    const allowUnavailableSourceFiles = !!config?.relativePaths;
    const la = new LanguageAdaptor(sm);
    la.buildSourceCFGs(allowUnavailableSourceFiles);
    return la;
  }
}
