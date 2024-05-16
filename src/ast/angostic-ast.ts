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

  /**
   * Method that searches for a node in the AST that has the smalles range wheren SourceCodeLocation (lineNr,colNr) fits
   * a.k.a. the most specific node
   * @param lineNr line nr of the source code location
   * @param colNr columnh nr of the source Code location
   * @returns the most specific node or undefined if none is found
   */

  mostSpecialisedNode(
    lineNr: number,
    colNr: number,
  ): Parser.SyntaxNode | undefined {
    const pos = sourceLocationToNodePosition(lineNr, colNr);
    return mostSpecialisedNode(this.ast, pos);
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

  nextNode(lineNr: number, colNr: number): Parser.SyntaxNode | undefined {
    const currentNode = this.mostSpecialisedNode(lineNr, colNr);
    if (currentNode === undefined) {
      return undefined;
    }
    const sibling = currentNode.nextSibling;
    if (isNode(sibling)) {
      return firstLeafChild(sibling);
    }

    let parent = currentNode.parent;
    while (isNode(parent)) {
      const parentSibling = parent.nextSibling;
      if (isNode(parentSibling)) {
        return firstLeafChild(parentSibling);
      }
      parent = parent.parent;
    }

    return undefined;
  }

  async buildAST(): Promise<void> {
    this._parser = await buildASTParser(this.targetLanguage);
    const content = await fs.promises.readFile(this.source);
    const sourceCode = content.toString();
    this._tree = this._parser.parse(sourceCode);
  }

  // following method should be move to AST class and belongs to WAT
  // public getFunction(id: number): WASMFunction | undefined {
  //   if (id >= this.wasm.imports.length) {
  //     return this.wasm.functions.find((f) => {
  //       return f.id === id;
  //     });
  //   } else {
  //     return this.wasm.imports.find((f) => {
  //       return f.id === id;
  //     });
  //   }
  // }

  // next method belongs to AST AssemblyScript
  // public override nextSourceCodeLocation(
  //   source: string,
  //   currentLineNr: number,
  //   currentColumnStart: number,
  // ): SourceCodeMapping[] {
  //   const tree = this._sourceTreeMap.get(source);
  //   if (tree === undefined) {
  //     return [];
  //   }

  //   const row = currentLineNr - 1;
  //   const col = currentColumnStart;
  //   const parentNode = searchNode(tree.rootNode, row, col);
  //   if (parentNode === undefined) {
  //     return [];
  //   }
  //   // split into getParentnode & getMostSpecialisedNode
  //   // use most specialised node to find mapping
  //   // if no mappings found for most specialised node
  //   // then go to a parent node and so on
  //   // the stop condition is once the parentNode is reached of the start
  //   // printNodeInfo(parentNode, `ParentNode found for row=${row} col=${col}`);
  //   // const specifNode = mostSpecialisedNode(parentNode, row, col);
  //   // printNodeInfo(
  //   //   parentNode,
  //   //   `MostSpecificNode found for row${row} col=${col}`,
  //   // );
  //   return this.nextLocations(parentNode);
  //   // return this.nextLocations(specifNode);
  // }

  // next method belongs to AST AssemblyScript
  // private nextLocations(node: Parser.SyntaxNode): SourceCodeMapping[] {
  //   let workingNodes = stepOverNode(node);
  //   const mappings: SourceCodeMapping[] = [];
  //   while (workingNodes.length > 0) {
  //     const node = workingNodes.pop();
  //     if (node === undefined) {
  //       throw new Error(
  //         `An array that is not zero should have an element to pop`,
  //       );
  //     }
  //     const lineNr = node.startPosition.row + 1;
  //     const colStart = node.startPosition.column;
  //     const colEnd = node.endPosition.column;

  //     let positions = this.generatedPositionFor({
  //       linenr: lineNr,
  //       columnStart: colStart,
  //       columnEnd: colEnd,
  //     });

  //     if (positions.length === 0) {
  //       // printNodeInfo(
  //       //   node,
  //       //   `Skipping Node since no mappings found for {lineNr:${lineNr},colStart:${colStart},colEnd:${colEnd}}`,
  //       // );
  //       const toAdd = stepOverNode(node);
  //       workingNodes = workingNodes.concat(toAdd);
  //       continue;
  //     }

  //     if (positions.length > 1) {
  //       logger.warn(
  //         `Multiple mappings found for after lineNr=${lineNr} & >=colStart=${colStart}`,
  //       );
  //       positions = positions.sort((p1, p2) => {
  //         return p1.columnStart - p2.columnStart;
  //       });
  //     }
  //     const pos = positions[0];
  //     if (pos.linenr !== lineNr) {
  //       logger.warn(
  //         `The found SourceLocation linenr ${pos.linenr} does not match the linenr of the AST node ${lineNr}`,
  //       );
  //     }
  //     if (pos.columnStart !== colStart) {
  //       logger.error(
  //         `The found SourceLocation columnStart ${pos.columnStart} does not match the columnStart of the AST node ${colStart}`,
  //       );
  //     }
  //     const alreadAddedy = mappings.find((m) => {
  //       return (
  //         m.address === pos.address &&
  //         m.linenr === pos.linenr &&
  //         m.columnStart === pos.columnStart &&
  //         m.columnEnd === pos.columnEnd &&
  //         m.source === pos.source
  //       );
  //     });
  //     if (alreadAddedy === undefined) {
  //       pos.columnEnd = colEnd;
  //       mappings.push(pos);
  //     }
  //   }
  //   return mappings;
  // }

  // next method belongs to AST AssemblyScript
  // public getFunction(id: number): WASMFunction | undefined {
  //   if (id >= this.wasm.imports.length) {
  //     return this.wasm.functions.find((f) => {
  //       return f.id === id;
  //     });
  //   } else {
  //     return this.wasm.imports.find((f) => {
  //       return f.id === id;
  //     });
  //   }
  // }

  // next method belongs to AST AssemblyScript
  // async buildComplemtaryContext(): Promise<void> {
  //   // const parser = await createLanguageParser(
  //   //   './src/source_mappers/language-parsers/tree-sitter-typescript.wasm',
  //   // );
  //   const parser = await createTypeScriptParser();
  //   await this.createAST(parser);
  // }
}
