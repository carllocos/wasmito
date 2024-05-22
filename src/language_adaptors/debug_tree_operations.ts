import type Parser from 'web-tree-sitter';
import { type AgnosticASTMap, AgnosticNode } from './agnostic_node';
import { type LanguageAdaptor } from './language_adaptor';
import { type MappingItem } from 'source-map';
import { createLogger } from '../logger/logger';
import {
  type SourceCodeLocation,
  type SourceMap,
  mappingItemToSourceCodeMapping,
} from '../source_mappers/source_map';
import { nodePositionToSourceLocation } from '../tree-sitter/tree-sitter-parser';
import { isAbsolutePath, isFilePath } from '../util/file_util';

const logger = createLogger('DebugAgnosticOperations');

export interface AgnosticDebugOperations {
  stepIn: (
    sourceCFG: SourceControlFlowGraph,
    sourceCFGNode: SourceCFGNode,
  ) => SourceCFGNode[];
  stepOver: (
    langAdaptor: LanguageAdaptor,
    node: AgnosticNode,
  ) => AgnosticNode | undefined;
}

function stepOver(
  langAdaptor: LanguageAdaptor,
  agnosticNode: AgnosticNode,
): AgnosticNode | undefined {
  if (agnosticNode.node === undefined) {
    return undefined;
  }
  const asts = langAdaptor.asts;
  const ast = asts.get(agnosticNode.source);
  if (ast === undefined) {
    return undefined;
  }

  let nextNode = ast.nextNode(
    agnosticNode.startPosition.linenr,
    agnosticNode.startPosition.colnr,
  );
  while (nextNode !== undefined) {
    const nextAgnosticNode = buildAgnosticNode(
      langAdaptor.asts,
      nextNode,
      langAdaptor.sourceMap,
      agnosticNode.source,
    );
    if (nextAgnosticNode !== undefined) {
      return nextAgnosticNode;
    }
    const [nextLineNr, nextColNr] = nodePositionToSourceLocation(
      nextNode.startPosition.row,
      nextNode.startPosition.column,
    );
    nextNode = ast.nextNode(nextLineNr, nextColNr);
  }

  return undefined;
}

function stepIn(
  sourceCFG: SourceControlFlowGraph,
  sourceCFGNode: SourceCFGNode,
): SourceCFGNode[] {
  return sourceCFG.getSourceEdges(sourceCFGNode);
}

function buildAgnosticNode(
  asts: AgnosticASTMap,
  node: Parser.SyntaxNode,
  sourceMap: SourceMap,
  source: string,
): AgnosticNode | undefined {
  const [linenr, columnStart] = nodePositionToSourceLocation(
    node.startPosition.row,
    node.startPosition.column,
  );
  const [linenrEnd, columnEnd] = nodePositionToSourceLocation(
    node.endPosition.row,
    node.endPosition.column,
  );
  if (linenrEnd !== linenr) {
    throw new Error(`Linenr should not differ between start and endPosition`);
  }

  for (let col = columnStart; col < columnEnd; ++col) {
    const loc: SourceCodeLocation = {
      source,
      linenr,
      columnStart: col,
    };

    const items = sourceMap.generatedPositionFor(loc);
    const itemtsToKeep: MappingItem[] = [];
    let itemWithSmallestAddr: MappingItem | undefined;
    for (const it of items) {
      // keep items that can be viewed
      if (
        (isAbsolutePath(it.source) && isFilePath(it.source)) ||
        asts.has(it.source)
      ) {
        if (itemWithSmallestAddr === undefined) {
          itemWithSmallestAddr = it;
        } else if (it.generatedColumn < itemWithSmallestAddr.generatedColumn) {
          itemWithSmallestAddr = it;
        }
        itemtsToKeep.push(it);
      }
    }

    if (itemtsToKeep.length >= 1) {
      logger.debug(
        `Found #${itemtsToKeep.length} ItemMapping suitable for source location {source: ${loc.source}, linenr: ${loc.linenr}, colnr: ${loc.columnStart}} will return the one with the smallest address`,
      );

      if (itemWithSmallestAddr === undefined) {
        throw new Error(`Item with SmallestAddress should not be undefined`);
      }
      const an = new AgnosticNode(node);
      an.addMapping(mappingItemToSourceCodeMapping(itemWithSmallestAddr));
      return an;
    }
  }
  return undefined;
}

export const DebugAgnosticOperations: AgnosticDebugOperations = {
  stepIn,
  stepOver,
};
