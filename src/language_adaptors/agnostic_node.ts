import type Parser from 'web-tree-sitter';
import {
  type SourceCodeLocation,
  type SourceMap,
  sourceCodeLocationToString,
} from '../source_mappers/source_map';
import { type AgnosticAST } from '../ast';
import { nodePositionToSourceLocation } from '../tree-sitter/tree-sitter-parser';
import { createLogger } from '../logger/logger';

export interface ASTNodeSourceLocation {
  linenr: number;
  colnr: number;
}

export class AgnosticNode {
  private readonly _node: Parser.Node;
  private readonly _mappings: Map<number, SourceCodeLocation>;

  private readonly _addresses: number[];
  private readonly _startPosition: ASTNodeSourceLocation;
  private readonly _endPosition: ASTNodeSourceLocation;
  private readonly _source: string;

  constructor(node: Parser.Node, src: string) {
    this._node = node;
    this._mappings = new Map();
    this._addresses = [];
    this._startPosition = this.getPositionHelper(this._node.startPosition);
    this._endPosition = this.getPositionHelper(this._node.endPosition);
    this._source = src;
  }

  get node(): Parser.Node {
    return this._node;
  }

  get startPosition(): ASTNodeSourceLocation {
    return this._startPosition;
  }

  get endPosition(): ASTNodeSourceLocation {
    return this._endPosition;
  }

  get source(): string {
    return this._source;
  }

  addMapping(m: SourceCodeLocation): void {
    if (!this._mappings.has(m.address)) {
      this._mappings.set(m.address, m);
      this._addresses.push(m.address);
      this._addresses.sort((addr1, addr2) => addr1 - addr2);
    }
  }

  getPositionHelper(point: Parser.Point): ASTNodeSourceLocation {
    const [linenr, colnr] = nodePositionToSourceLocation(
      point.row,
      point.column,
    );
    return {
      linenr,
      colnr,
    };
  }
}

export type AgnosticASTMap = Map<string, AgnosticAST>;

const logger = createLogger('AgnosticNode');

export function AgnosticNodeFromWasmAddress(
  sourceMap: SourceMap,
  asts: AgnosticASTMap,
  addr: number,
): AgnosticNode | undefined {
  const positions = sourceMap.getOriginalPositionFor(addr);
  if (positions.length === 0) {
    return undefined;
  }

  const nodes = new Set<[Parser.Node, SourceCodeLocation]>();
  for (const pos of positions) {
    const ast = asts.get(pos.source);
    if (ast === undefined) {
      logger.debug(`No AST found for source ${pos.source}`);
      return undefined;
    }
    const node = ast.mostSpecialisedNode(pos.linenr, pos.colnr);
    if (node !== undefined) {
      nodes.add([node, pos]);
    }
  }

  const nodesFound = Array.from(nodes);

  if (nodesFound.length === 1) {
    const [nodeFound, mappingFound] = nodesFound[0];
    const an = new AgnosticNode(nodeFound, mappingFound.source);
    an.addMapping(mappingFound);
    return an;
  } else if (nodesFound.length > 1) {
    const positionsStr = positions.map(sourceCodeLocationToString).join(', ');
    throw new Error(
      `Multiple AST nodes found for addr ${addr} and locations ${positionsStr}`,
    );
  } else {
    const positionsStr = positions.map(sourceCodeLocationToString).join(', ');
    logger.debug(
      `Could not find any AST node of for addr ${addr} that fits best with source locations [${positionsStr}]`,
    );
    return undefined;
  }
}
