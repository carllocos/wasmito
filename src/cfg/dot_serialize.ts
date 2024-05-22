import { isCallIndirect, isCallInstruction } from '../webassembly';
import {
  sourceCFGHasOutgoingFunCallEdges,
  type SourceCFGNode,
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
  nodes: SourceCFGNode[], // multiple nodes as there may be multiple entry nodes per function
  nameGraph: string,
): string {
  const header = `digraph "CFG of ${nameGraph}" `;
  const nodesDone = new Set<number>();
  let nodesStr = '';
  const exitNodesToAdd = new Set<number>();
  for (const n of nodes) {
    if (nodesDone.has(n.nodeId)) {
      continue;
    }
    if (sourceCFGHasOutgoingFunCallEdges(n)) {
      for (const callinstr of n.edgesToOutSideCalls) {
        if (isCallInstruction(callinstr)) {
          exitNodesToAdd.add(callinstr.funIdx);
        } else if (isCallIndirect(callinstr)) {
          throw new Error(`Call indirect not yet supported`);
        } else {
          throw new Error(`outgoing instructions should be (indirect) calls`);
        }
      }
    }
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

    const label = `{Data block ${n.nodeId}|${s}}`;

    const nodeStr = `block${n.nodeId} [shape=${record}, label="${label}"];\n`;
    nodesStr += nodeStr;
    nodesDone.add(n.nodeId);
    nodes.push(n);
  }

  for (const fid of exitNodesToAdd.values()) {
    const record = 'record';
    const label = `Data block ${fid}|instr<4>call ${fid}}`;
    nodesStr += `block${fid} [shape=${record}, label="${label}"];\n`;
  }

  const alreadyVisitedNodes = new Set<number>();
  const edgesStr: string[] = [];
  for (const n of nodes) {
    if (alreadyVisitedNodes.has(n.nodeId)) {
      continue;
    }
    alreadyVisitedNodes.add(n.nodeId);
    const nodeId = `block${n.nodeId}`;
    const str = n.edges
      .map((edgeNode) => {
        return `${nodeId} -> block${edgeNode.nodeId};\n`;
      })
      .join('');
    edgesStr.push(str);
    if (sourceCFGHasOutgoingFunCallEdges(n)) {
      for (const callInstr of n.edgesToOutSideCalls) {
        if (isCallInstruction(callInstr)) {
          edgesStr.push(`${nodeId} -> block${callInstr.funIdx};\n`);
        } else if (isCallIndirect(callInstr)) {
          throw new Error(`Call indirect not yet supported`);
        } else {
          throw new Error(`outgoing instructions should be (indirect) calls`);
        }
      }
    }
  }
  const allEdges = edgesStr.join('');

  return `${header}{\n${nodesStr}${allEdges}}`;
}
