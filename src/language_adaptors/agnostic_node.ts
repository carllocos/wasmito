import type Parser from 'web-tree-sitter';
import {
  mappingItemToSourceCodeMapping,
  mappingItemToString,
  type SourceCodeMapping,
  type SourceMap,
} from '../source_mappers/source_map';
import { type MappingItem } from 'source-map';
import { type AgnosticAST } from '../ast';
import { nodePositionToSourceLocation } from '../tree-sitter/tree-sitter-parser';

export interface ASTNodeSourceLocation {
  linenr: number;
  colnr: number;
}

export interface AgnosticNode {
  node?: Parser.SyntaxNode;
  m: SourceCodeMapping;
  startPosition?: ASTNodeSourceLocation;
  endPosition?: ASTNodeSourceLocation;
}

export function AgnosticNodeFromWasmAddress(
  sourceMap: SourceMap,
  asts: Map<string, AgnosticAST>,
  addr: number,
): AgnosticNode | undefined {
  // trick to remove duplicates via set
  const positions = Array.from(new Set(sourceMap.getOriginalPositionFor(addr)));
  if (positions.length === 0) {
    return undefined;
  }

  const nodes = new Set<[Parser.SyntaxNode, MappingItem]>();
  for (const pos of positions) {
    const ast = asts.get(pos.source);
    if (ast === undefined) {
      throw new Error(`No AST found for source ${pos.source}`);
    }
    const node = ast.mostSpecialisedNode(pos.originalLine, pos.originalColumn);
    if (node !== undefined) {
      nodes.add([node, pos]);
    }
  }

  const nodesFound = Array.from(nodes);

  if (nodesFound.length === 1) {
    const [nodeFound, mappingFound] = nodesFound[0];
    const [ls, cs] = nodePositionToSourceLocation(
      nodeFound.startPosition.row,
      nodeFound.startPosition.column,
    );

    const [le, ce] = nodePositionToSourceLocation(
      nodeFound.endPosition.row,
      nodeFound.endPosition.column,
    );
    return {
      node: nodeFound,
      m: mappingItemToSourceCodeMapping(mappingFound),
      startPosition: {
        linenr: ls,
        colnr: cs,
      },
      endPosition: {
        linenr: le,
        colnr: ce,
      },
    };
  } else if (nodesFound.length > 1) {
    const positionsStr = positions.map(mappingItemToString).join(', ');
    throw new Error(
      `Multiple AST nodes found for addr ${addr} and locations ${positionsStr}`,
    );
  } else {
    const positionsStr = positions.map(mappingItemToString).join(', ');
    throw new Error(
      `Could not find any AST node of for addr ${addr} that fits best with source locations [${positionsStr}]`,
    );
  }
}
