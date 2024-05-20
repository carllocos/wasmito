import { type WasmInstruction } from '../webassembly/wasm/wasm_instruction';
import { type Graph, type CFGNode, getNode } from './wasm_cfg';

export function breadthFirstTraverseWasmCFGT(
  g: Graph,
  entryNode: CFGNode,
  onNode: (n: CFGNode) => void,
  onEdge: (
    from: CFGNode,
    fromIstruction: WasmInstruction,
    to: CFGNode,
    toInstruction: WasmInstruction,
  ) => void,
): void {
  const visitedNodes = new Set<number>();
  const visitedEdges: Array<[number, number, number, number]> = [];
  const q: CFGNode[] = [entryNode];
  visitedNodes.add(entryNode.nodeID);
  while (q.length > 0) {
    const n = q.shift();
    if (n === undefined) {
      throw new Error(`n should not be undefined`);
    }
    onNode(n);
    const edges = n.edges;
    for (const e of edges) {
      const toNode = getNode(g, e.instrTo.startAddress);
      const hasEdge = visitedEdges.find(([nfID, faddr, ntID, taddr]) => {
        return (
          nfID === n.nodeID &&
          faddr === e.instrFrom.startAddress &&
          taddr === e.instrTo.startAddress &&
          ntID === toNode.nodeID
        );
      });
      if (hasEdge === undefined) {
        onEdge(n, e.instrFrom, toNode, e.instrTo);
        visitedEdges.push([
          n.nodeID,
          e.instrFrom.startAddress,
          e.instrTo.startAddress,
          toNode.nodeID,
        ]);
      }
      if (!visitedNodes.has(toNode.nodeID)) {
        q.push(toNode);
        visitedNodes.add(toNode.nodeID);
      }
    }
  }
}
