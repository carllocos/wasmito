import { createLogger } from '../logger/logger';
import { BinaryLiftedCFG, SourceCFGs, isSCFGEmpty } from '../cfg/source_cfg';
import { isCallInstruction } from '../webassembly/wasm/wasm_instruction';
import { CFGOperations } from '../tool_api/cfg_util';
import {
  getCallInstructions,
  SourceCFGNode,
  sourceNodeFirstInstrStartAddr,
  sourceNodeFirstInstruction,
} from '../cfg/source_cfg_node_edge';

export type DestinationSCFGNode = [SourceCFGNode, number];

export type DebugOperation = (
  sourceCFGs: SourceCFGs,
  node: SourceCFGNode,
) => DestinationSCFGNode[];

const logger = createLogger('DebugAgnosticOperations');
export interface AgnosticDebugOperations {
  /*
   * stepIn resumes the execution of the program until the next source code location is reached.
   * The next source code location may be the entry of a called function.
   */
  stepIn: DebugOperation;

  /*
   * The semantics of step over is if the current location is a function call
   * then the debugger should run the function call without interruption.
   * And the debugger should stop the first program location after the call.
   */
  stepOver: DebugOperation;

  /*
   * step out completes the execution of the current function and stops the execution
   * at the first source code location that is reached after exiting the function call.
   */
  stepOut: DebugOperation;

  /*
   * Debug operation is called from within a loop (e.g., while, for).
   * This operation ensures that program execution resumes until the next iteration of the loop.
   * Concretely, this operation finds the SCFG nodes that correspond to the entry of the loop
   * or exit of the loop.
   */
  stepIteration: DebugOperation;

  /**
   * stepUntilCall: Debug operation that continues execution until just before a function call is reached.
   */

  stepUntilCall: DebugOperation;

  /**
   * stepRecursiveCall
   * This debug operation is supposed to be called from within a function that is recursively called.
   * If executed, the debug operation returns the entry nodes of this current function.
   */

  stepRecursiveCall: DebugOperation;
}

function stepOver(
  sourceCFGs: SourceCFGs,
  node: SourceCFGNode,
): DestinationSCFGNode[] {
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
): DestinationSCFGNode[] {
  let ns: Array<[SourceCFGNode, number]> = [];
  if (CFGOperations.isCallNode(node)) {
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
): DestinationSCFGNode[] {
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
): DestinationSCFGNode[] {
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
  const scfg = sourceCFGs.getFunctionSourceCFGOrError(node.wasmFunOwner);
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
    for (const [_fromNode, _fromInstr, toInstr] of n.incomingEdges) {
      if (nodeAddresses.includes(toInstr.startAddress)) continue;
      destinationNodes.push([n, toInstr.startAddress]);
      nodeAddresses.push(toInstr.startAddress);
    }
    duplicateCheck.set(n.nodeId, nodeAddresses);
  }
  return destinationNodes;
}

// TODO a function that navigates the CFG node per node
// the idea is that somehow that function does step into, step over, etc,
// it advances computation as if it would be at runtime
// the computation should keep track of possible multipaths

function cleanDuplicates(ns: DestinationSCFGNode[]): DestinationSCFGNode[] {
  return ns;
}

function getLinkedSCFGs(
  scfgs: SourceCFGs,
  callNode: SourceCFGNode,
): [BinaryLiftedCFG[], Set<number>] {
  const linked: BinaryLiftedCFG[] = [];
  const unlinked: Set<number> = new Set();
  const calls = getCallInstructions(callNode);
  for (const call of calls) {
    const calledFuncs: number[] = [];
    if (isCallInstruction(call)) {
      calledFuncs.push(call.funIdx);
    } else {
      logger.warn(
        `untilCall: ignoring call_indirect instruction at address ${call.startAddress} in node ${callNode.nodeId}`,
      );
      throw new Error(`Handle call indirect case`);
    }

    for (const f of calledFuncs) {
      const scfg = scfgs.getFunctionSourceCFG(f);
      if (scfg === undefined || isSCFGEmpty(scfg)) {
        unlinked.add(call.funIdx);
      } else {
        linked.push(scfg);
      }
    }
  }

  return [linked, unlinked];
}

function stepUntilCall(
  scfgs: SourceCFGs,
  startNode: SourceCFGNode,
): DestinationSCFGNode[] {
  // TODO: this function should account for possible loops in the CFG.
  // scenario: startNode is a callNode
  // scenario: follow loop
  // for each function called check if SCFG exists
  // if not check if needed to stop
  // if yes stop there

  // you are already at the start node
  if (CFGOperations.isCallNode(startNode)) {
    const [calledFuncs] = getLinkedSCFGs(scfgs, startNode);
    if (calledFuncs.length > 0) {
      return [];
    }
  }

  const q: SourceCFGNode[] = [startNode];
  const visitedNodes = new Set<number>();
  let n: SourceCFGNode | undefined;
  const priorCalls: DestinationSCFGNode[] = [];
  while ((n = q.pop()) !== undefined) {
    if (visitedNodes.has(n.nodeId)) continue;

    visitedNodes.add(n.nodeId);

    if (CFGOperations.isCallNode(n)) {
      const [calledFuncs, unlinked] = getLinkedSCFGs(scfgs, n);
      let found = false;
      if (calledFuncs.length > 0) {
        found = true;
      }

      const imported = scfgs.sourceMap.wasm.importFuncs.filter((f) =>
        unlinked.has(f.id),
      );
      if (found || imported.length > 0) {
        const instr = sourceNodeFirstInstruction(n);
        priorCalls.push([n, instr.startAddress]);
        continue;
      }
    }

    // TODO: handle the case where PC is currently pointing to an instruction in startNode
    // and that instruction is after a call instruction and before another call instruction
    // this debug operation should advance just until the next call instruction
    // if (callsFound.length > 1) {
    //   logger.warn(
    //     `untilCall: multiple call instructions in node ${n.nodeId}, taking the first one`,
    //   );
    // } else if (callsFound.length === 1) {
    //   priorCalls.push([n, callsFound[0].startAddress]);
    //   continue;
    // }

    for (const [n2] of n.edges) {
      q.push(n2);
    }
  }
  return cleanDuplicates(priorCalls);
}

function stepRecursiveCall(
  scfgs: SourceCFGs,
  startNode: SourceCFGNode,
): DestinationSCFGNode[] {
  // TODO use call sites to find if recursive call
  // const callSites = scfgs.wasmCFGs.callSites(startNode.wasmFunOwner);
  // if (!callSites.has(startNode.wasmFunOwner)) {
  //   return [];
  // }
  const wcfg = scfgs.wasmCFGs.getCFGOrError(startNode.wasmFunOwner);
  let isRecursive = false;
  for (const call of wcfg.calls) {
    if (call.funIdx === startNode.wasmFunOwner) {
      isRecursive = true;
      break;
    }
  }

  if (!isRecursive) {
    return [];
  }
  const entryNodes =
    scfgs.getFunctionSourceCFG(startNode.wasmFunOwner)?.entryNodes ?? [];
  return entryNodes.map((n) => [n, sourceNodeFirstInstrStartAddr(n)]);
}

export const DebugOperations: AgnosticDebugOperations = {
  stepIn,
  stepOver,
  stepOut,
  stepIteration,
  stepUntilCall: stepUntilCall,
  stepRecursiveCall: stepRecursiveCall,
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
    case 'step-until-call':
    case 'stepUntilCall':
      return stepUntilCall;
    case 'step-recursive-call':
    case 'stepRecursiveCall':
      return stepRecursiveCall;
    default:
      return undefined;
  }
}
