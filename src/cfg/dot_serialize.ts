import {
  isCallIndirect,
  isCallInstruction,
} from '../webassembly/wasm/wasm_instruction';
import {
  type FunctionTreeGraph,
  sourceCFGHasOutgoingFunCallEdges,
} from './source_cfg';
import {
  getWasmNodeEdges,
  getWasmCFGNode,
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
    const n = getWasmCFGNode(g, addr);
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
    const str = getWasmNodeEdges(g, n)
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

export function sourceControlFlowGraphToDot(
  fgraph: FunctionTreeGraph,
  nameGraph: string,
): string {
  const entryNodes = new Set(fgraph.entyNodes.map((n) => n.nodeId));
  const allnodes = fgraph.allNodes;
  const header = `digraph "CFG of ${nameGraph}" `;
  const nodesDone = new Set<number>();
  let nodesStr = '';
  const exitNodesToAdd = new Set<number>();
  const funNames = new Map<number, string>();
  for (const n of allnodes) {
    if (nodesDone.has(n.nodeId)) {
      continue;
    }
    if (sourceCFGHasOutgoingFunCallEdges(n)) {
      for (const callinstr of n.edgesToOutSideCalls) {
        if (isCallInstruction(callinstr)) {
          exitNodesToAdd.add(callinstr.funIdx);
          funNames.set(callinstr.funIdx, callinstr.args[0]);
        } else if (isCallIndirect(callinstr)) {
          throw new Error(`Call indirect not yet supported`);
        } else {
          throw new Error(`outgoing instructions should be (indirect) calls`);
        }
      }
    }
    const record = n.instructions.length > 1 ? 'Mrecord' : 'record';

    const sp = n.node.startPosition;
    const instructionsStrs: string[] = [
      `(line ${sp.linenr}, col ${sp.colnr}) ${n.node.node.text}`,
    ];
    // for (let i = 0; i < n.instructions.length; i++) {
    //   const instr = n.instructions[i];
    //   const instrIdx = n.instructionsIndexes[i];

    //   instructionsStrs.push(
    //     `instr ${instrIdx}: (start ${instr.startAddress}, end ${instr.endAddress}) ${instr.name} ${instr.immediate ?? ''} ${instr.args}`,
    //   );
    // }
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

    const label = `{Data block ${n.nodeId}|${s}}`;

    const nodeStr = `block${n.nodeId} [shape=${record}, label="${label}"];\n`;
    nodesStr += nodeStr;
    nodesDone.add(n.nodeId);
    allnodes.push(n);
  }

  // for (const fid of exitNodesToAdd.values()) {
  //   const record = 'record';
  //   const fname = funNames.get(fid) ?? `${fid}`;
  //   const label = `FunCall ${fname}|instr<4>call ${fid}}`;
  //   nodesStr += `block${fid} [shape=${record}, label="${label}"];\n`;
  // }

  const entryNodeID = `block-1`;
  // if (allnodes.length > 1) {
  // const record2 = 'record';
  // const label = `EntryNode`;
  nodesStr += `${entryNodeID} [shape=record, label="EntryNode"];\n`;
  // }

  const alreadyVisitedNodes = new Set<number>();
  const edgesStr: string[] = [];
  for (const n of allnodes) {
    if (alreadyVisitedNodes.has(n.nodeId)) {
      continue;
    }
    alreadyVisitedNodes.add(n.nodeId);
    const nodeId = `block${n.nodeId}`;
    if (entryNodes.has(n.nodeId)) {
      edgesStr.push(`${entryNodeID}->${nodeId};\n`);
    }
    const str = n.edges
      .map((edgeNode) => {
        return `${nodeId} -> block${edgeNode.nodeId};\n`;
      })
      .join('');
    edgesStr.push(str);
    // if (sourceCFGHasOutgoingFunCallEdges(n)) {
    //   for (const callInstr of n.edgesToOutSideCalls) {
    //     if (isCallInstruction(callInstr)) {
    //       edgesStr.push(`${nodeId} -> block${callInstr.funIdx};\n`);
    //     } else if (isCallIndirect(callInstr)) {
    //       throw new Error(`Call indirect not yet supported`);
    //     } else {
    //       throw new Error(`outgoing instructions should be (indirect) calls`);
    //     }
    //   }
    // }
  }
  const allEdges = edgesStr.join('');

  return `${header}{\n${nodesStr}${allEdges}}`;
}
