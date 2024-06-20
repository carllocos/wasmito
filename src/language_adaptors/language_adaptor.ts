import { AgnosticAST } from '../ast/angostic-ast';
import { getFileExtension, isFilePath } from '../util/file_util';
import { createLogger } from '../logger/logger';
import { type SourceMap } from '../source_mappers/source_map';
import { type AgnosticASTMap } from './agnostic_node';
import { WasmControlFlowGraph } from '../cfg/wasm_cfg';
import { SourceControlFlowGraph } from '../cfg/source_cfg';
import { getLangConfigFromExtension } from './languages/all_langs';
import { type LanguageConfiguration } from './languages/language_config';

const logger = createLogger('LanguageAdaptor');

export async function constructLanguageAdaptor(
  sourceMap: SourceMap,
): Promise<LanguageAdaptor> {
  const la = new LanguageAdaptor(sourceMap);
  await la.buildComplementaryContext();
  return la;
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

  private async buildASTS(): Promise<void> {
    const availableSources: Array<[string, LanguageConfiguration]> = [];
    for (const s of this.sourceMap.sources) {
      if (!isFilePath(s)) {
        logger.info(
          `Will not create an AST for source file ${s} as such filepath does not exist `,
        );
        continue;
      }

      const ext = getFileExtension(s);
      if (ext === undefined) {
        logger.info(
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

    for (const [s, langConfig] of availableSources) {
      const ast = new AgnosticAST(s, langConfig);
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
