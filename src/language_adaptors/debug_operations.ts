// import { createLogger } from '../logger/logger';
import {
  type SourceCFGs,
  type SourceCFGNode,
  isCallNode,
  sourceNodeFirstInstrStartAddr,
} from '../cfg/source_cfg';

export type DestinationSCFGNodes = Array<[SourceCFGNode, number]>;

export type DebugOperation = (
  sourceCFGs: SourceCFGs,
  node: SourceCFGNode,
) => DestinationSCFGNodes;

// const logger = createLogger('DebugAgnosticOperations');
export interface AgnosticDebugOperations {
  stepIn: DebugOperation;

  /*
   * The semantics of step over is if the current location is a function call
   * then the debugger should run the function call without interruption.
   * And the debugger should stop the first program location after the call.
   */
  stepOver: DebugOperation;

  stepOut: DebugOperation;

  stepIteration: DebugOperation;
}

function stepOver(
  sourceCFGs: SourceCFGs,
  node: SourceCFGNode,
): DestinationSCFGNodes {
  const ignoreExitNodes = true;
  const ns = sourceCFGs.getNodeNeighbours(node, ignoreExitNodes);
  if (ns.length === 0) {
    return stepOut(sourceCFGs, node);
  }
  return ns;
}

function stepIn(
  sourceCFGs: SourceCFGs,
  node: SourceCFGNode,
): DestinationSCFGNodes {
  let ns: Array<[SourceCFGNode, number]> = [];
  if (isCallNode(node)) {
    const entryNodes = sourceCFGs.getFunctionEntryNodesFromNode(node);
    ns = entryNodes.map((n) => [n, sourceNodeFirstInstrStartAddr(n)]);
  }

  if (ns.length === 0) {
    const ignoreExitNodes = true;
    ns = sourceCFGs.getNodeNeighbours(node, ignoreExitNodes);
  }

  if (ns.length === 0) {
    return stepOut(sourceCFGs, node);
  } else {
    return ns;
  }
}

function stepOut(
  sourceCFGs: SourceCFGs,
  node: SourceCFGNode,
): DestinationSCFGNodes {
  const ns: Array<[SourceCFGNode, number]> = [];
  const added = new Set<number>();
  const funID = node.wasmFunOwner;
  const wasmAddresses = sourceCFGs.wasmCFGs.callSites(funID);
  for (const addr of wasmAddresses) {
    const callNode = sourceCFGs.nodesFromAddress(addr);
    if (callNode === undefined) {
      // TODO check why this can happen
      continue;
    }
    const nodesPostCall = stepOver(sourceCFGs, callNode);
    for (const [n, addr] of nodesPostCall) {
      if (!added.has(addr)) {
        added.add(addr);
        ns.push([n, addr]);
      }
    }
  }
  return ns;
}

export function stepIteration(
  sourceCFGs: SourceCFGs,
  node: SourceCFGNode,
): DestinationSCFGNodes {
  // find cycle
  const visitedNodes = new Set<number>();
  const q: SourceCFGNode[] = [node];
  const cycle: SourceCFGNode[] = [];
  let cycleFound = false;
  let n: SourceCFGNode | undefined;
  while ((n = q.pop()) !== undefined) {
    if (visitedNodes.has(n.nodeId)) {
      if (n.nodeId === node.nodeId) {
        cycleFound = true;
        break;
      }
      continue;
    }
    cycle.push(n);
    visitedNodes.add(n.nodeId);
    for (const [n2] of n.edges) {
      q.push(n2);
    }
  }

  if (!cycleFound) return [];

  // find cycle start
  const scfg = sourceCFGs.getFunctionSourceCFGStrict(node.wasmFunOwner);
  const visitedNodes2 = new Set<number>();
  const cycleStart: SourceCFGNode[] = [];
  for (const entryNode of scfg.entryNodes) {
    const q2: SourceCFGNode[] = [entryNode];
    let n2: SourceCFGNode | undefined;
    while ((n2 = q2.pop()) !== undefined) {
      if (cycle.includes(n2)) {
        cycleStart.push(n2);
        break;
      }
      if (visitedNodes2.has(n2.nodeId)) {
        continue;
      }
      visitedNodes2.add(n2.nodeId);
      for (const [neighbour] of n2.edges) {
        q2.push(neighbour);
      }
    }
    visitedNodes2.clear();
  }

  // find cycle end
  // (3) find loop exit nodes
  const exitLoop: SourceCFGNode[] = [];
  for (const c of cycle) {
    if (c.edges.length <= 1) continue;
    for (const [n] of c.edges) {
      if (cycle.includes(n)) continue;
      exitLoop.push(n);
      // TODO
      // case that can occur:
      // neighbour n is part of the same loop as c
      // but it is not part of the cyclepath
      // n is part of another cyclepath
      // such as (a) -> (c)->(l) or (a)-> (b)->(l):
      // loop (condition) {(l)
      // (a)
      //   if (condition) {
      //     (b)
      //   }
      //  else {
      //   (c)
      //  }
      // }
      // assuming cyclepath is (a)->(c)->(l)
      // here (a) has 2 neighbours where (b)
      // is part of cycle but not cyclepath
      // then neighbour should not be added.
      // To know this we need to find all possible cyclepaths.
      // in part 1 i think already
      // take blink_intermittent.rs as example
    }
  }

  const duplicateCheck = new Map<number, number[]>();
  const destinationNodes: Array<[SourceCFGNode, number]> = [];
  for (const n of cycleStart.concat(exitLoop)) {
    const nodeAddresses = duplicateCheck.get(n.nodeId) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_fromNode, _fromInstr, toInstr] of n.incomingEdges) {
      if (nodeAddresses.includes(toInstr.startAddress)) continue;
      destinationNodes.push([n, toInstr.startAddress]);
      nodeAddresses.push(toInstr.startAddress);
    }
    duplicateCheck.set(n.nodeId, nodeAddresses);
  }
  return destinationNodes;
}

export const DebugOperations: AgnosticDebugOperations = {
  stepIn,
  stepOver,
  stepOut,
  stepIteration,
};

export type DebugOperationName = string;

export function DebugOperationFromName(
  name: DebugOperationName,
): DebugOperation | undefined {
  switch (name) {
    case 'step-into':
    case 'stepInto':
      return stepIn;
    case 'step-over':
    case 'stepOver':
      return stepOver;
    case 'step-out':
    case 'stepOut':
      return stepOut;
    case 'step-iteration':
    case 'stepIteration':
      return stepIteration;
    default:
      return undefined;
  }
}
