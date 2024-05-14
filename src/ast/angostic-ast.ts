import fs from 'fs';
import type Parser from 'web-tree-sitter';
import { buildASTParser } from '../tree-sitter/tree-sitter-factory';
import { isFilePath } from '../util/file_util';

export class AgnosticAST {
  public readonly source: string;
  public readonly targetLanguage: string;
  private _parser: Parser | undefined;
  private _tree: Parser.Tree | undefined;

  constructor(source: string, targetLanguage: string) {
    this.source = source;
    if (!isFilePath(source)) {
      throw new Error(`Give source file does not exist ${source}`);
    }
    this.targetLanguage = targetLanguage;
  }

  get ast(): Parser.Tree {
    if (this._tree === undefined) {
      throw new Error(`No AST available first construct it`);
    }
    return this._tree;
  }

  async constructTree(): Promise<void> {
    this._parser = await buildASTParser(this.targetLanguage);
    const content = await fs.promises.readFile(this.source);
    const sourceCode = content.toString();
    this._tree = this._parser.parse(sourceCode);
  }
}
