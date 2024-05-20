import { AgnosticAST } from '../ast/angostic-ast';
import { isFilePath } from '../util/file_util';
import { createLogger } from '../logger/logger';
import { type SourceMap } from '../source_mappers/source_map';
import { type AgnosticASTMap } from './agnostic_node';

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
  constructor(sourceMap: SourceMap) {
    this.sourceMap = sourceMap;
    this._asts = new Map();
  }

  get asts(): AgnosticASTMap {
    return this._asts;
  }

  async buildComplementaryContext(): Promise<void> {
    await this.buildASTS();
  }

  private async buildASTS(): Promise<void> {
    const availableSources: string[] = [];
    for (const s of this.sourceMap.sources) {
      if (!isFilePath(s)) {
        logger.info(
          `Will not create an AST for source file ${s} as such filepath does not exist `,
        );
        continue;
      }
      availableSources.push(s);
    }

    for (const s of availableSources) {
      const ast = new AgnosticAST(s, this.sourceMap.targetLanguage);
      // todo: remove tmp if introduced due to the lack of wat parser
      if (
        this.sourceMap.targetLanguage !== 'wat' &&
        this.sourceMap.targetLanguage !== 'wast'
      ) {
        await ast.buildAST();
      }
      this._asts.set(s, ast);
    }
  }
}
