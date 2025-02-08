// import { createLogger } from '../logger/logger';
import {
  type SourceControlFlowGraph,
  type SourceCFGNode,
  isCallNode,
} from '../cfg/source_cfg';

// const logger = createLogger('DebugAgnosticOperations');

export interface AgnosticDebugOperations {
  stepIn: (
    sourceCFG: SourceControlFlowGraph,
    node: SourceCFGNode,
  ) => Array<[SourceCFGNode, number]>;

  /*
   * The semantics of step over is if the current location is a function call
   * then the debugger should run the function call without interruption.
   * And the debugger should stop the first program location after the call.
   */
  stepOver: (
    sourceCFG: SourceControlFlowGraph,
    node: SourceCFGNode,
  ) => Array<[SourceCFGNode, number]>;

  stepOut: (
    SourceCFGNode: SourceControlFlowGraph,
    node: SourceCFGNode,
  ) => Array<[SourceCFGNode, number]>;
}

function stepOver(
  sourceCFG: SourceControlFlowGraph,
  node: SourceCFGNode,
): Array<[SourceCFGNode, number]> {
  const ignoreExitNodes = true;
  const ns = sourceCFG.getNodeNeighbours(node, ignoreExitNodes);
  if (ns.length === 0) {
    return stepOut(sourceCFG, node);
  }
  return ns;
}

function stepIn(
  sourceCFG: SourceControlFlowGraph,
  node: SourceCFGNode,
): Array<[SourceCFGNode, number]> {
  let ns: Array<[SourceCFGNode, number]> = [];
  if (isCallNode(node)) {
    const entryNodes = sourceCFG.getFunctionEntryNodesFromNode(node);
    ns = entryNodes.map((n) => [n, n.instructions[0].startAddress]);
  }

  if (ns.length === 0) {
    const ignoreExitNodes = true;
    ns = sourceCFG.getNodeNeighbours(node, ignoreExitNodes);
  }

  if (ns.length === 0) {
    return stepOut(sourceCFG, node);
  } else {
    return ns;
  }
}

function stepOut(
  sourceCFG: SourceControlFlowGraph,
  node: SourceCFGNode,
): Array<[SourceCFGNode, number]> {
  const ns: Array<[SourceCFGNode, number]> = [];
  const added = new Set<number>();
  const funID = node.wasmFunOwner;
  const wasmAddresses = sourceCFG.wasmCFG.callSites(funID);
  for (const addr of wasmAddresses) {
    const callNode = sourceCFG.nodesFromAddress(addr);
    if (callNode === undefined) {
      // TODO check why this can happen
      continue;
    }
    const nodesPostCall = stepOver(sourceCFG, callNode);
    for (const [n, addr] of nodesPostCall) {
      if (!added.has(addr)) {
        added.add(addr);
        ns.push([n, addr]);
      }
    }
  }
  return ns;
}

export const DebugOperations: AgnosticDebugOperations = {
  stepIn,
  stepOver,
  stepOut,
};
