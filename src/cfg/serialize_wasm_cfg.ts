import {
  getEdgeNodes,
  getNode,
  type CFGNode,
  type WasmGraph,
} from './wasm_cfg';

export function wasmControlFlowGraphToDot(
  g: WasmGraph,
  nameGraph: string,
): string {
  const header = `digraph "CFG of ${nameGraph}" `;
  const nodesDone = new Set<number>();
  let nodesStr = '';
  const nodes: CFGNode[] = [];
  for (const [addr, node] of g.entries()) {
    if (nodesDone.has(node.nodeID)) {
      continue;
    }
    const n = getNode(g, addr);
    const record = n.instructions.length > 1 ? 'Mrecord' : 'record';

    const instructionsStrs: string[] = [];
    for (let i = 0; i < n.instructions.length; i++) {
      const instr = n.instructions[i];
      const instrIdx = n.instructionsIndexes[i];

      instructionsStrs.push(
        `instr ${instrIdx}: (start ${instr.startAddress}, end ${instr.endAddress}) ${instr.name} ${instr.immediate ?? ''} ${instr.args}`,
      );
    }
    let s = '';
    if (instructionsStrs.length === 1) {
      s = instructionsStrs[0];
    } else {
      s = instructionsStrs
        .map((instStr) => {
          return `{${instStr}\\l}`;
        })
        .join('|');
    }

    const label = `{${n.changesFlow ? 'Control' : 'Data'} block ${n.nodeID}|${s}}`;

    const nodeStr = `block${n.nodeID} [shape=${record}, label="${label}"];\n`;
    nodesStr += nodeStr;
    nodesDone.add(n.nodeID);
    nodes.push(n);
  }

  const edgesStr: string[] = [];
  for (const n of nodes) {
    const nodeId = `block${n.nodeID}`;
    const edges = n.edges;
    const str = getEdgeNodes(g, n)
      .map((edgeNode, i) => {
        const e = edges[i];
        const instFrom = e.instrFrom;
        const instTo = e.instrTo;
        return `${nodeId} -> block${edgeNode.nodeID} [label="from ${instFrom.startAddress} to ${instTo.startAddress}"];\n`;
      })
      .join('');
    edgesStr.push(str);
  }
  const allEdges = edgesStr.join('');

  return `${header}{\n${nodesStr}${allEdges}}`;
}
