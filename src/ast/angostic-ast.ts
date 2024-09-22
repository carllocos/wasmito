import fs from 'fs';
import type Parser from 'web-tree-sitter';
import { buildASTParser } from '../tree-sitter/tree-sitter-factory';
import { isFilePath } from '../util/file_util';
import {
  firstLeafChild,
  isNode,
  mostSpecialisedNode,
  sourceLocationToNodePosition,
} from '../tree-sitter/tree-sitter-parser';
import { isFilePath } from '../util/file_util';
import { type ASTDebuggableLanguage } from '../language_adaptors/language_config';
import { AgnosticNode } from '../language_adaptors/agnostic_node';

export class AgnosticAST {
  public readonly source: string;
  public readonly targetLanguage: ASTDebuggableLanguage;
  private _parser: Parser | undefined;
  private _tree: Parser.Tree | undefined;

  constructor(source: string, langConfig: ASTDebuggableLanguage) {
    this.source = source;
    if (!isFilePath(source)) {
      throw new Error(`Given source file does not exist ${source}`);
    }
    this.targetLanguage = langConfig;
  }

  get ast(): Parser.Tree {
    if (this._tree === undefined) {
      throw new Error(`No AST available first construct it`);
    }
    return this._tree;
  }

  /**
   * Method that searches for a node in the AST that has the smalles range wheren SourceCodeLocation (lineNr,colNr) fits
   * a.k.a. the most specific node
   * @param lineNr line nr of the source code location
   * @param colNr columnh nr of the source Code location
   * @returns the most specific node or undefined if none is found
   */

  mostSpecialisedNode(lineNr: number, colNr: number): AgnosticNode | undefined {
    const pos = sourceLocationToNodePosition(lineNr, colNr);
    const n = mostSpecialisedNode(this.ast, pos);
    if (n === undefined) {
      return undefined;
    } else {
      return new AgnosticNode(n);
    }
  }

  /**
   * Method that returns the sibling of the mostspecificnode associated with position (lineNr, colNr).
   * If no sibling is available it will go to the next sibling of the parent and return the most inner child
   *
   * Method assumes that current source location (lineNr, colNr) does not change the control flow.
   * AND
   * Method assumes that the control flow follows the tree
   * @param lineNr
   * @param colNr
   * @returns
   */

  nextNode(lineNr: number, colNr: number): AgnosticNode | undefined {
    const currentNode = this.mostSpecialisedNode(lineNr, colNr);
    if (currentNode === undefined) {
      return undefined;
    }
    const sibling = currentNode.node.nextSibling;
    if (isNode(sibling)) {
      return new AgnosticNode(firstLeafChild(sibling));
    }

    let parent = currentNode.node.parent;
    while (isNode(parent)) {
      const parentSibling = parent.nextSibling;
      if (isNode(parentSibling)) {
        return new AgnosticNode(firstLeafChild(parentSibling));
      }
      parent = parent.parent;
    }

    return undefined;
  }

  async buildAST(): Promise<void> {
    this._parser = await buildASTParser(this.targetLanguage.parserPath);
    const content = await fs.promises.readFile(this.source);
    const sourceCode = content.toString();
    this._tree = this._parser.parse(sourceCode);
  }
}
