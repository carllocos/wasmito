import { type WasmInstruction } from '../webassembly/wasm/wasm_instruction';
import {
  type WasmAddrToNodeMap,
  type CFGNode,
  getWasmCFGNode,
} from './wasm_cfg';

export interface TraversalCallBacks {
  onNode?: (n: CFGNode) => void;
  onEdge?: (
    from: CFGNode,
    fromInstruction: WasmInstruction,
    to: CFGNode,
    toInstruction: WasmInstruction,
  ) => void;
}

export function breadthFirstTraverseWasmCFG(
  g: WasmAddrToNodeMap,
  entryNode: CFGNode,
  callbacks: TraversalCallBacks,
): void {
  if (callbacks.onEdge === undefined && callbacks.onNode === undefined) {
    throw new Error(`Expected on callback to be provided`);
  }
  const visitedNodes = new Set<number>();
  const visitedEdges: Array<[number, number, number, number]> = [];
  const q: CFGNode[] = [entryNode];
  while (q.length > 0) {
    const n = q.shift();
    if (n === undefined) {
      throw new Error(`n should not be undefined`);
    }
    if (visitedNodes.has(n.nodeID)) {
      continue;
    }
    visitedNodes.add(n.nodeID);
    if (callbacks.onNode !== undefined) {
      callbacks.onNode(n);
    }
    const edges = n.edges;
    for (const e of edges) {
      const toNode = getWasmCFGNode(g, e.instrTo.startAddress);
      const hasEdge = visitedEdges.find(([nfID, fAddr, ntID, tAddr]) => {
        return (
          nfID === n.nodeID &&
          fAddr === e.instrFrom.startAddress &&
          tAddr === e.instrTo.startAddress &&
          ntID === toNode.nodeID
        );
      });
      if (hasEdge === undefined) {
        if (callbacks.onEdge !== undefined) {
          callbacks.onEdge(n, e.instrFrom, toNode, e.instrTo);
        }
        visitedEdges.push([
          n.nodeID,
          e.instrFrom.startAddress,
          e.instrTo.startAddress,
          toNode.nodeID,
        ]);
      }
      if (!visitedNodes.has(toNode.nodeID)) {
        q.push(toNode);
      }
    }
  }
}
