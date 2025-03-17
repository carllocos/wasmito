import { type WasmInstruction } from '../webassembly/wasm/wasm_instruction';
import {
  type FunToSourceCFG,
  sourceNodeFirstInstruction,
  type SourceCFGNode,
} from './source_cfg';
import { sourceCFGNodeAndInstrFromIncrInstrAddrs } from './source_cfg_builder';
import {
  getCalledFunctions,
  getWasmCFGNode,
  isWasmCallNode,
  type WasmCFGs,
  type CFGNode,
  type WasmCFG,
} from './wasm_cfg';

export function searchForNextReachableSourceNodes(
  funToSourceCFG: FunToSourceCFG,
  wasmCFGs: WasmCFGs,
  g: WasmCFG,
  startNode: CFGNode,
  sourceNodes: SourceCFGNode[],
  visitedNodes = new Set<number>(),
): [Array<[SourceCFGNode, WasmInstruction]>, Set<number>] {
  const q = [startNode];
  let n: CFGNode | undefined;
  const next: Array<[SourceCFGNode, WasmInstruction]> = [];
  while ((n = q.shift()) !== undefined) {
    if (visitedNodes.has(n.nodeID)) {
      continue;
    }
    visitedNodes.add(n.nodeID);
    const found = sourceCFGNodeAndInstrFromIncrInstrAddrs(n, sourceNodes);
    if (found !== undefined) {
      next.push(found);
      continue;
    }

    if (isWasmCallNode(n)) {
      const calledFuncs = getCalledFunctions(n);
      for (const calledFunc of calledFuncs) {
        const scfg = funToSourceCFG.get(calledFunc);
        if (scfg === undefined) {
          const funCFG = wasmCFGs.getCFG(calledFunc);
          if (funCFG !== undefined) {
            const [ns, newAlreadyVisited] = searchForNextReachableSourceNodes(
              funToSourceCFG,
              wasmCFGs,
              funCFG,
              funCFG.entryNode,
              sourceNodes,
              visitedNodes,
            );
            newAlreadyVisited.forEach((v) => visitedNodes.add(v));
            next.push(...ns);
          }
        } else {
          const ens: Array<[SourceCFGNode, WasmInstruction]> =
            scfg.entryNodes.map((en) => [en, sourceNodeFirstInstruction(en)]);
          next.push(...ens);
        }
      }
    }

    for (const e of n.edges) {
      const toWasmNode = getWasmCFGNode(g.addrToNode, e.instrTo.startAddress);
      q.push(toWasmNode);
    }
  }

  return [next, visitedNodes];
}
