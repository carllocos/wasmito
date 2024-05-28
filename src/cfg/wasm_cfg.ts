import { writeFileSync } from 'fs';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import {
  type WasmInstruction,
  isControlFlowInstruction,
  isWasmInstructionBlockBased,
  isBranch,
  isBranchIf,
  isLoopInstruction,
  isReturnBranch,
  isIfInstruction,
  instructionToString,
} from '../webassembly/wasm/wasm_instruction';
import { type WasmModule } from '../webassembly/wasm/wasm_module';
import { WASMOpcodeNumber } from '../webassembly/wasm/wasm_opcode';
import { wasmControlFlowGraphToDot } from './dot_serialize';
import path from 'path';

export interface CFGEdge {
  instrFrom: WasmInstruction;
  instrTo: WasmInstruction;
}

export interface CFGNode {
  nodeID: number;
  changesFlow: boolean;
  startAddress: number;
  endAddress: number;
  instructions: WasmInstruction[];
  instructionsIndexes: number[];
  edges: CFGEdge[];
}

export type WasmGraph = Map<number, CFGNode>;

export interface WASMFunGraph {
  entyNode: CFGNode;
  graph: WasmGraph;
}

export class WasmControlFlowGraph {
  private readonly _wasm: WasmModule;
  private readonly _cfgs: Map<number, WASMFunGraph>;

  constructor(wasm: WasmModule) {
    this._wasm = wasm;
    this._cfgs = new Map();
    this.buildGraphs();
  }

  getCFG(funID: number): WASMFunGraph | undefined {
    return this._cfgs.get(funID);
  }

  getCFGStrict(funID: number): WASMFunGraph {
    const r = this.getCFG(funID);
    if (r === undefined) {
      throw new Error(`no CFG found for fun ${funID}`);
    }
    return r;
  }

  serializeToDot(outputDir: string, funIds: number[] = []): string[] {
    const dots: string[] = [];
    if (funIds.length === 0) {
      this._wasm.functions.forEach((f) => funIds.push(f.id));
    }
    for (const fid of funIds) {
      const p = path.join(outputDir, `wasmfun${fid}.dot`);
      const funGraph = this.getCFGStrict(fid);
      const content = wasmControlFlowGraphToDot(
        funGraph.graph,
        `function ${fid}`,
      );
      writeFileSync(p, content);
      dots.push(content);
    }
    return dots;
  }

  private buildGraphs(): void {
    for (const f of this._wasm.functions) {
      this._cfgs.set(f.id, buildCFGForFunc(f));
    }
  }
}

function lastInstruction(n: CFGNode): WasmInstruction {
  return n.instructions[n.instructions.length - 1];
}

export function controlFlowGraphToString(
  g: WasmGraph,
  entryNode: CFGNode,
): string {
  return controlFlowGraphToStringHelper(g, entryNode, new Set<number>())[0];
}

function controlFlowGraphToStringHelper(
  g: WasmGraph,
  n: CFGNode,
  blocksProcessed: Set<number>,
): [string, Set<number>] {
  if (blocksProcessed.has(n.nodeID)) {
    return ['', blocksProcessed];
  }
  let s = `${n.changesFlow ? 'Control' : 'Data'} Block ${n.nodeID}\n`;
  const seperator = '-'.repeat(s.length);
  s = `${seperator}\n${s}${seperator}\n`;

  for (let i = 0; i < n.instructions.length; i++) {
    const inst = n.instructions[i];
    const idx = n.instructionsIndexes[i];
    s += `${idx} (start:${inst.startAddress}, end ${inst.endAddress}) ${inst.name} ${inst.args.length === 0 ? inst.immediate : inst.args}\n`;
  }
  let bp: Set<number> = blocksProcessed.add(n.nodeID);
  const edgeNodes = getWasmNodeEdges(g, n);
  for (let j = 0; j < n.edges.length; j++) {
    const edge = n.edges[j];
    const edgeNode = edgeNodes[j];
    s += `---([${edge.instrFrom.startAddress} ${edge.instrFrom.name}] -> [${edge.instrTo.startAddress} ${edge.instrTo.name}]] ${edgeNode.nodeID} Block`;
  }
  s += '\n';

  for (const edgeNode of edgeNodes) {
    const [nextGraphStr, nextBlocksProces] = controlFlowGraphToStringHelper(
      g,
      edgeNode,
      bp,
    );
    bp = nextBlocksProces;
    s += `${nextGraphStr}`;
  }
  return [s, bp];
}

export function getWasmNodeEdges(g: WasmGraph, n: CFGNode): CFGNode[] {
  const edgeNodes: CFGNode[] = [];
  for (let i = 0; i < n.edges.length; i++) {
    const instTo = n.edges[i].instrTo;
    edgeNodes.push(getWasmCFGNode(g, instTo.startAddress));
  }
  if (edgeNodes.length !== n.edges.length) {
    throw new Error(
      `#${edgeNodes.length} neighbour nodes were expected but only got ${edgeNodes.length}`,
    );
  }
  return edgeNodes;
}

export function buildControlFlowGraphFunction(
  wasm: WasmModule,
  funcID: number,
): WASMFunGraph {
  const fun = wasm.getFunction(funcID);

  if (fun === undefined) {
    throw new Error(
      `Function with id ${funcID} does not exists in given module`,
    );
  }
  if (fun.allInstructions.length === 0) {
    throw new Error(`Function has no instructions to use for building cfg`);
  }
  const graph = buildCFGForFunc(fun);
  return graph;
}

export function getWasmCFGNode(g: WasmGraph, addr: number): CFGNode {
  const n = g.get(addr);
  if (n === undefined) {
    throw new Error(`No  node found for address ${addr}`);
  }
  return n;
}

function addEdge(g: WasmGraph, n1Address: number, n2Address: number): void {
  const n1 = getWasmCFGNode(g, n1Address);
  const n2 = getWasmCFGNode(g, n2Address);
  const instrFrom = n1.instructions.find((inst) => {
    return inst.startAddress === n1Address;
  });
  if (instrFrom === undefined) {
    throw new Error(
      `No from isntruction found for ${n1Address} in node ID ${n1.nodeID}`,
    );
  }
  const instrTo = n2.instructions.find((inst) => {
    return inst.startAddress === n2Address;
  });

  if (instrTo === undefined) {
    throw new Error(
      `No to isntruction found for ${n2Address} in node ID ${n2.nodeID}`,
    );
  }

  const edgeAlreadyPresent = n1.edges.find((e) => {
    return (
      e.instrFrom.startAddress === instrFrom.startAddress &&
      e.instrTo.startAddress === instrTo.startAddress
    );
  });
  if (edgeAlreadyPresent === undefined) {
    n1.edges.push({
      instrFrom,
      instrTo,
    });
  }
}

function createNode(
  nodeID: number,
  changesFlow: boolean,
  instrs: WasmInstruction[],
  indexes: number[],
  edges: CFGEdge[],
): CFGNode {
  const sortedIdx = indexes.sort((i1, i2) => i1 - i2);
  const sortedInstrs = instrs.sort(
    (i1, i2) => i1.startAddress - i2.startAddress,
  );
  let startAddress = -1;
  let endAddress = -1;
  if (sortedInstrs.length > 0) {
    startAddress = sortedInstrs[0].startAddress;
    endAddress = sortedInstrs[sortedInstrs.length - 1].endAddress;
  }

  return {
    nodeID,
    changesFlow,
    instructions: sortedInstrs,
    instructionsIndexes: sortedIdx,
    edges,
    startAddress,
    endAddress,
  };
}

export function nodeToStr(n: CFGNode): string {
  const s = `${n.changesFlow ? 'Control' : 'Data'} node id=${n.nodeID}`;
  const istrs = n.instructions.map((i) => instructionToString(i)).join(', ');
  const idxs = n.instructionsIndexes.map((i) => `${i}`).join(', ');
  const edgesStr = n.edges
    .map((e) => {
      const s1 = instructionToString(e.instrFrom);
      const s2 = instructionToString(e.instrTo);
      return `${s1} -> ${s2}`;
    })
    .join(', ');

  return `${s} {\n instrs:[${istrs}],\nidxs:[${idxs}],\nedges:[${edgesStr}]}`;
}

function mergeNodes(g: WasmGraph, n1Address: number, n2Address: number): void {
  const n1 = getWasmCFGNode(g, n1Address);
  const n2 = getWasmCFGNode(g, n2Address);
  if (n1.changesFlow) {
    throw new Error(
      `Node n1 for addr ${n1Address} changes control flow and cannot be merged`,
    );
  }
  if (n2.changesFlow) {
    throw new Error(
      `Node n1 for addr ${n2Address} changes control flow and cannot be merged`,
    );
  }

  if (n1.nodeID === n2.nodeID) {
    throw new Error(`Attempting to merge the same node`);
  }

  const edges = n1.edges.concat(n2.edges);
  const indexes = n1.instructionsIndexes.concat(n2.instructionsIndexes);
  const insts = n1.instructions.concat(n2.instructions);
  const nodeID = n1.nodeID < n2.nodeID ? n1.nodeID : n2.nodeID;
  const mergedNode = createNode(nodeID, false, insts, indexes, edges);

  for (let i = 0; i < mergedNode.instructions.length; i++) {
    const instr = mergedNode.instructions[i];
    g.set(instr.startAddress, mergedNode);
  }
}

function buildCFGForFunc(fun: WASMFunction): WASMFunGraph {
  const g: WasmGraph = new Map();
  for (let i = 0; i < fun.allInstructions.length; i++) {
    const instr = fun.allInstructions[i];
    const instrChangesFlow =
      isControlFlowInstruction(instr) || isWasmInstructionBlockBased(instr);
    const n = createNode(i, instrChangesFlow, [instr], [i], []);
    g.set(instr.startAddress, n);
  }
  buildCFGNodesHelper(g, fun.body, [
    {
      startBlockInstruction: fun.body[0],
      instructionAfterBlock: fun.body[fun.body.length - 1],
    },
  ]);
  const entryNode = getWasmCFGNode(g, fun.allInstructions[0].startAddress);
  return { entyNode: entryNode, graph: g };
}

interface BlockScope {
  startBlockInstruction: WasmInstruction;
  instructionAfterBlock: WasmInstruction;
}

function buildCFGNodesHelper(
  g: Map<number, CFGNode>,
  instructions: WasmInstruction[],
  blockScopes: BlockScope[],
  entryAddress?: number | undefined,
  exitAddress?: number | undefined,
): void {
  for (let i = 0; i < instructions.length; i++) {
    const instr = instructions[i];
    if (
      !isControlFlowInstruction(instr) &&
      !isWasmInstructionBlockBased(instr)
    ) {
      if (entryAddress === undefined) {
        entryAddress = instr.startAddress;
        continue;
      }

      const entryNode = getWasmCFGNode(g, entryAddress);
      const entryNodeInstr = lastInstruction(entryNode);
      if (entryNode.changesFlow) {
        if (!isBranch(entryNodeInstr)) {
          addEdge(g, entryAddress, instr.startAddress);
        }
      } else {
        mergeNodes(g, entryAddress, instr.startAddress);
      }
      entryAddress = instr.startAddress;
      continue;
    }

    if (entryAddress !== undefined) {
      addEdge(g, entryAddress, instr.startAddress);
      entryAddress = instr.startAddress;
    }

    if (isControlFlowInstruction(instr)) {
      if (isBranchIf(instr) || isBranch(instr)) {
        const scopeIdx = instr.brachTarget + 1;
        const targetBlock = blockScopes[blockScopes.length - scopeIdx];
        const targetBlockInstr = targetBlock.startBlockInstruction;
        const afterBlockInstr = targetBlock.instructionAfterBlock;

        if (isBranch(instr)) {
          const branchNode = getWasmCFGNode(g, instr.startAddress);
          branchNode.edges = [];
        }

        if (isLoopInstruction(targetBlockInstr)) {
          const firstLoopInstr = targetBlockInstr.subInstructions[0];
          addEdge(g, instr.startAddress, firstLoopInstr.startAddress);
        } else {
          addEdge(g, instr.startAddress, afterBlockInstr.startAddress);
        }
        continue;
      } else if (instr.opcodeNr === WASMOpcodeNumber.Br_table) {
        throw new Error(`TODO add backedges for BR_table case`);
      } else if (isReturnBranch(instr)) {
        const targetBlock = blockScopes[0];
        const afterBlockInstr = targetBlock.instructionAfterBlock;
        addEdge(g, instr.startAddress, afterBlockInstr.startAddress);
      } else {
        continue;
      }
    }

    if (i + 1 >= instructions.length) {
      break;
    }

    // case where instr is a block based structure instr
    // the end instruction of the block instr is the last inst of its subisntrcs
    // the next inst of instructions as instructions[i+1] is the inst after the block'end
    const instrAfterBlock = instructions[i + 1];
    const endBlockAddr = instrAfterBlock.startAddress;
    const newScopes = blockScopes.slice(); // copy
    newScopes.push({
      startBlockInstruction: instr,
      instructionAfterBlock: instrAfterBlock,
    });
    if (isIfInstruction(instr)) {
      buildCFGNodesHelper(
        g,
        instr.consequence,
        newScopes,
        instr.startAddress,
        endBlockAddr,
      );
      if (instr.hasAlternativeBlock()) {
        buildCFGNodesHelper(
          g,
          instr.alternative,
          newScopes,
          instr.startAddress,
          endBlockAddr,
        );
      } else {
        // No alternative block so add edge between if and nextExitAddr
        addEdge(g, instr.startAddress, endBlockAddr);
      }
    } else {
      // instr is block or loop
      buildCFGNodesHelper(
        g,
        instr.subInstructions,
        newScopes,
        instr.startAddress,
        endBlockAddr,
      );
    }
    // skip endAddress of block as it has already been handled
    entryAddress = endBlockAddr;
    i = i + 1;
  }

  if (exitAddress !== undefined) {
    if (entryAddress === undefined) {
      throw new Error(
        'Entry address is not expected to be undefined when reaching end',
      );
    }

    addEdge(g, entryAddress, exitAddress);
  }
}
