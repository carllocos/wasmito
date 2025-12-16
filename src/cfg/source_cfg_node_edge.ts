import { AgnosticNode } from '../language_adaptors/agnostic_node';
import { SourceCodeLocation } from '../source_mappers/source_map';
import {
  CallIndirect,
  CallInstruction,
  isCallIndirect,
  isCallInstruction,
  WasmInstruction,
} from '../webassembly/wasm/wasm_instruction';

export type SourceCFGEdge = [SourceCFGNode, WasmInstruction, WasmInstruction];

export function SourceCFGEdgeToInstruction(
  edge: SourceCFGEdge,
): WasmInstruction {
  return edge[2];
}

export function SourceCFGEdgeToNode(edge: SourceCFGEdge): SourceCFGNode {
  return edge[0];
}
export function SourceCFGEdgeFromInstruction(
  edge: SourceCFGEdge,
): WasmInstruction {
  return edge[1];
}

export interface SourceCFGNode {
  nodeId: number;
  node?: AgnosticNode;
  sourceLocation: SourceCodeLocation;
  edges: SourceCFGEdge[];
  wasmFunOwner: number;
  instructions: WasmInstruction[];
  instructionsIndexes: number[];
  incomingEdges: SourceCFGEdge[];
}

export function sourceCFGNodeToJSONObj(n: SourceCFGNode): object {
  const edges: object[] = n.edges.map(([e, _]) => {
    return { nodeID: e.nodeId };
  });

  return {
    nodeId: n.nodeId,
    node: 'TODO AgnosticNode',
    sourceLocation: n.sourceLocation as object,
    wasmFunOwner: n.wasmFunOwner,
    instructions: n.instructions.map((i) => i.toJSONObj()),
    instructionsIndexes: n.instructionsIndexes,
    edges,
  };
}

export function sourceNodeFirstInstruction(n: SourceCFGNode): WasmInstruction {
  return n.instructions[0];
}

export function sourceNodeFirstInstrStartAddr(n: SourceCFGNode): number {
  return n.instructions[0].startAddress;
}

export function sourceNodeLastInstruction(n: SourceCFGNode): WasmInstruction {
  return n.instructions[n.instructions.length - 1];
}

export function sourceNodeLastInstructionStartAddress(
  n: SourceCFGNode,
): number {
  return n.instructions[n.instructions.length - 1].startAddress;
}

export function getCallInstructions(
  n: SourceCFGNode,
): Array<CallInstruction | CallIndirect> {
  const calls: Array<CallInstruction | CallIndirect> = [];
  for (const i of n.instructions) {
    if (isCallInstruction(i) || isCallIndirect(i)) {
      calls.push(i);
    }
  }
  return calls;
}
