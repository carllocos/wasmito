// import { createLogger } from '../logger/logger';
import {
  type SourceControlFlowGraph,
  type SourceCFGNode,
  sourceCFGHasOutgoingFunCallEdges,
} from '../cfg/source_cfg';

// const logger = createLogger('DebugAgnosticOperations');

export interface AgnosticDebugOperations {
  stepIn: (
    sourceCFG: SourceControlFlowGraph,
    node: SourceCFGNode,
  ) => SourceCFGNode[];

  /*
   * The semantics of step over is if the current location is a function call
   * then the debugger should run the function call without interruption.
   * And the debugger should stop the first program location after the call.
   */
  stepOver: (
    sourceCFG: SourceControlFlowGraph,
    node: SourceCFGNode,
  ) => SourceCFGNode[];
}

function stepOver(
  sourceCFG: SourceControlFlowGraph,
  node: SourceCFGNode,
): SourceCFGNode[] {
  const ignoreExitNodes = true;
  return sourceCFG.getNodeNeighbours(node, ignoreExitNodes);
}

function stepIn(
  sourceCFG: SourceControlFlowGraph,
  node: SourceCFGNode,
): SourceCFGNode[] {
  let ns: SourceCFGNode[] = [];
  if (sourceCFGHasOutgoingFunCallEdges(node)) {
    ns = sourceCFG.getFunctionEntryNodesFromNode(node);
  }

  if (ns.length === 0) {
    const ignoreExitNodes = true;
    ns = sourceCFG.getNodeNeighbours(node, ignoreExitNodes);
  }

  return ns;
}

export const DebugAgnosticOperations: AgnosticDebugOperations = {
  stepIn,
  stepOver,
};
