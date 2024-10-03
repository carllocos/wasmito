import type Parser from 'web-tree-sitter';
import { type AgnosticAST } from '../ast/angostic-ast';

export interface ASTNodeSourceLocation {
  linenr: number;
  colnr: number;
}

export class AgnosticNode {
  private readonly _node: Parser.SyntaxNode;

  constructor(node: Parser.SyntaxNode) {
    this._node = node;
  }

  get node(): Parser.SyntaxNode {
    return this._node;
  }
}

export type AgnosticASTMap = Map<string, AgnosticAST>;
