import { CFGOperations } from '../tool_api/cfg_util';
import {
  isCallIndirect,
  isCallInstruction,
} from '../webassembly/wasm/wasm_instruction';
import {
  type BinaryLiftedCFG,
  type DotSerializationConfig,
} from './source_cfg';
import {
  coarseSourceCFGNodeHasCallInstructions,
  getCallInstructionsCoarseSourceNode,
  type CoarseFunctionGraph,
} from './source_cfg_coarse';
import { getCallInstructions } from './source_cfg_node_edge';
import { getWasmCFGNode, type CFGNode, type WasmCFG } from './wasm_cfg';

export function wasmControlFlowGraphToDot(
  wasmCFG: WasmCFG,
  nameGraph: string,
): string {
  const header = `digraph "CFG of ${nameGraph}" `;
  const nodesDone = new Set<number>();
  let nodesStr = '';
  const nodes: CFGNode[] = [];
  const g = wasmCFG.addrToNode;
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

  // add exit node to nodes
  const exitNodeID = `blockExit`;
  nodesStr += `${exitNodeID} [shape=record, label="ExitNode"];\n`;

  const edgesStr: string[] = [];
  for (const n of nodes) {
    const nodeId = `block${n.nodeID}`;
    const str = n.edges
      .map((e) => {
        const instFrom = e.instrFrom;
        const instTo = e.instrTo;
        const toNode = getWasmCFGNode(g, instTo.startAddress);
        return `${nodeId} -> block${toNode.nodeID} [label="from ${instFrom.startAddress} to ${instTo.startAddress}"];\n`;
      })
      .join('');
    edgesStr.push(str);
  }
  edgesStr.push(`block${wasmCFG.exitNode.nodeID} -> ${exitNodeID};\n`);

  const allEdges = edgesStr.join('');

  return `${header}{\n${nodesStr}${allEdges}}`;
}

export function sourceControlFlowGraphToDot(
  fgraph: BinaryLiftedCFG,
  nameGraph: string,
  config: DotSerializationConfig,
): string {
  const entryNodes = new Set(fgraph.entryNodes.map((n) => n.nodeId));
  const allnodes = fgraph.allNodes;
  const header = `digraph "CFG of ${nameGraph}" `;
  const nodesDone = new Set<number>();
  let nodesStr = '';
  for (const n of allnodes) {
    if (nodesDone.has(n.nodeId)) {
      continue;
    }
    const record = n.instructions.length > 1 ? 'Mrecord' : 'record';

    let c = '';
    if (CFGOperations.isCallNode(n)) {
      const calls = getCallInstructions(n);
      const direct: number[] = [];
      const indirect: number[] = [];
      for (const call of calls) {
        if (isCallInstruction(call)) {
          direct.push(call.funIdx);
        } else if (isCallIndirect(call)) {
          call.targetFuncs.forEach((tf) => indirect.push(tf));
        }
      }
      const indirectstr =
        indirect.length > 0 ? ` indirect ${indirect.join(', ')}` : '';
      c += ` (call ${direct.join(', ')}${indirectstr})`;
    }
    const instructionsStrs: string[] = [];
    if (config.includeInstructions) {
      for (let i = 0; i < n.instructions.length; i++) {
        const instr = n.instructions[i];
        const instrIdx = n.instructionsIndexes[i];

        instructionsStrs.push(
          `instr ${instrIdx}: (start ${instr.startAddress}, end ${instr.endAddress}) ${instr.name} ${instr.immediate ?? ''} ${instr.args}`,
        );
      }
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

    const sp = n.sourceLocation;
    let srcTxt = n.sourceLocation.name;
    if (n.node !== undefined) {
      srcTxt = n.node.node.text;
    }
    srcTxt = escapeText(srcTxt);
    const label = `{(line ${sp.linenr}, col ${sp.colnr}) ${srcTxt} ${c} ${config.includeInstructions ? '|' : ''}${s}}`;

    const nodeStr = `block${n.nodeId} [shape=${record}, label="${label}"];\n`;
    nodesStr += nodeStr;
    nodesDone.add(n.nodeId);
    allnodes.push(n);
  }

  // add entry and exit nodes
  const entryNodeID = `block1`;
  if (config.includeEntryNode) {
    nodesStr += `${entryNodeID} [shape=record, label="EntryNode"];\n`;
  }
  const exitNodeID = `blockExit`;
  if (config.includeExitNode) {
    if (fgraph.exitNodes.length > 0) {
      nodesStr += `${exitNodeID} [shape=record, label="ExitNode"];\n`;
    }
  }

  const alreadyVisitedNodes = new Set<number>();
  const edgesStr: string[] = [];
  for (const n of allnodes) {
    if (alreadyVisitedNodes.has(n.nodeId)) {
      continue;
    }
    alreadyVisitedNodes.add(n.nodeId);
    const nodeId = `block${n.nodeId}`;
    if (config.includeEntryNode && entryNodes.has(n.nodeId)) {
      edgesStr.push(`${entryNodeID}->${nodeId};\n`);
    }
    const str = n.edges
      .map(([edgeNode, fromInstr, toInstr]) => {
        let s = `${nodeId} -> block${edgeNode.nodeId}`;
        if (config.includeInstructions) {
          s += ` [label="from ${fromInstr.startAddress} to ${toInstr.startAddress}"]`;
        }
        s += ';\n';
        return s;
      })
      .join('');
    edgesStr.push(str);
  }

  if (config.includeExitNode) {
    for (const en of fgraph.exitNodes) {
      edgesStr.push(`block${en.nodeId} -> ${exitNodeID};\n`);
    }
  }
  const allEdges = edgesStr.join('');

  return `${header}{\n${nodesStr}${allEdges}}`;
}

const charsToEscape = new Set<string>(['<', '{', '}']);

function escapeText(txt: string): string {
  const t: string[] = [];
  for (const c of txt) {
    if (charsToEscape.has(c)) {
      t.push(`\\${c}`);
    } else {
      t.push(c);
    }
  }
  return t.join('');
}

export function coarseSourceControlFlowGraphToDot(
  fgraph: CoarseFunctionGraph,
  nameGraph: string,
): string {
  const entryNodes = new Set(fgraph.entryNodes.map((n) => n.nodeId));
  const allnodes = fgraph.allNodes;
  const header = `digraph "CFG of ${nameGraph}" `;
  const nodesDone = new Set<number>();
  let nodesStr = '';
  for (const n of allnodes) {
    if (nodesDone.has(n.nodeId)) {
      continue;
    }
    const record = n.instructions.length > 1 ? 'Mrecord' : 'record';

    const nodeText: string[] = [];
    for (const sl of n.sourceLocations) {
      const c = `(line ${sl.linenr}, col ${sl.colnr})`;
      nodeText.push(c);
    }

    if (coarseSourceCFGNodeHasCallInstructions(n)) {
      const direct: number[] = [];
      const indirect: number[] = [];
      const callInstrs = getCallInstructionsCoarseSourceNode(n);
      for (const call of callInstrs) {
        if (isCallInstruction(call)) {
          direct.push(call.funIdx);
        } else if (isCallIndirect(call)) {
          call.targetFuncs.forEach((tf) => indirect.push(tf));
        }
      }
      const indirectstr =
        indirect.length > 0 ? ` indirect ${indirect.join(', ')}` : '';
      nodeText.push(` (call ${direct.join(', ')}${indirectstr})`);
    }

    const joined = nodeText.join('\n');
    const label = `{Data block ${n.nodeId}|${joined}}`;
    const nodeStr = `block${n.nodeId} [shape=${record}, label="${label}"];\n`;
    nodesStr += nodeStr;
    nodesDone.add(n.nodeId);
    allnodes.push(n);
  }

  const entryNodeID = `block1`;
  nodesStr += `${entryNodeID} [shape=record, label="EntryNode"];\n`;

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
  }
  const allEdges = edgesStr.join('');

  return `${header}{\n${nodesStr}${allEdges}}`;
}
