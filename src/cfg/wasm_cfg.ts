import {
  type WASMFunction,
  isIfInstruction,
  isBranchIf,
  isBranch,
  WASMOpcodeNumber,
  isReturnBranch,
  isLoopInstruction,
} from '../webassembly';
import {
  type WasmInstruction,
  isControlFlowInstruction,
  isWasmInstructionBlockBased,
} from '../webassembly/wasm/wasm_instruction';
import { type WasmModule } from '../webassembly/wasm/wasm_module';
import { controlFlowGraphToDot } from './serialize_wasm_cfg';

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

function lastInstruction(n: CFGNode): WasmInstruction {
  return n.instructions[n.instructions.length - 1];
}

export function controlFlowGraphToString(g: Graph, entryNode: CFGNode): string {
  return controlFlowGraphToStringHelper(g, entryNode, new Set<number>())[0];
}

function controlFlowGraphToStringHelper(
  g: Graph,
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
  const edgeNodes = getEdgeNodes(g, n);
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

export function getEdgeNodes(g: Graph, n: CFGNode): CFGNode[] {
  const edgeNodes: CFGNode[] = [];
  for (let i = 0; i < n.edges.length; i++) {
    const instTo = n.edges[i].instrTo;
    edgeNodes.push(getNode(g, instTo.startAddress));
  }
  if (edgeNodes.length !== n.edges.length) {
    throw new Error(
      `#${edgeNodes.length} neighbour nodes were expected but only got ${edgeNodes.length}`,
    );
  }
  return edgeNodes;
}

export class WasmControlFlowGraph {
  private readonly _wasm: WasmModule;
  private readonly _cfgs: Map<number, [CFGNode, Graph]>;

  constructor(wasm: WasmModule) {
    this._wasm = wasm;
    this._cfgs = new Map();
    this.buildGraphs();
  }

  serializeToDot(funId?: number): Array<[number, string]> {
    let funcs = this._wasm.functions;
    if (funId !== undefined) {
      const f = this._wasm.getFunction(funId);
      if (f === undefined) {
        throw new Error(`No function found with id ${funId}`);
      }
      funcs = [f];
    }
    const results: Array<[number, string]> = [];
    for (const f of funcs) {
      const res = this._cfgs.get(f.id);
      if (res === undefined) {
        throw new Error(`No graph found for funcID ${f.id}`);
      }
      const g = res[1];
      results.push([f.id, controlFlowGraphToDot(g, `function ${f.id}`)]);
    }
    return results;
  }

  private buildGraphs(): void {
    for (const f of this._wasm.functions) {
      this._cfgs.set(f.id, buildCFGForFunc(f));
    }
  }
}

export function buildControlFlowGraphFunction(
  wasm: WasmModule,
  funcID: number,
): [CFGNode, Graph] {
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

export type Graph = Map<number, CFGNode>;

export function getNode(g: Graph, addr: number): CFGNode {
  const n = g.get(addr);
  if (n === undefined) {
    throw new Error(`No  node found for address ${addr}`);
  }
  return n;
}

function addEdge(g: Graph, n1Address: number, n2Address: number): void {
  const n1 = getNode(g, n1Address);
  const n2 = getNode(g, n2Address);
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

  const fs = instrToString(instrFrom);
  const ts = instrToString(instrTo);
  const edgeAlreadyPresent = n1.edges.find((e) => {
    return (
      e.instrFrom.startAddress === instrFrom.startAddress &&
      e.instrTo.startAddress === instrTo.startAddress
    );
  });
  if (edgeAlreadyPresent === undefined) {
    console.log(`add edge from ${fs} -> ${ts}`);
    n1.edges.push({
      instrFrom,
      instrTo,
    });
  } else {
    console.log(
      `add edge from ${fs} -> ${ts} cancelled as edge already present`,
    );
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

function nodeToStr(n: CFGNode): string {
  const s = `${n.changesFlow ? 'Control' : 'Data'} node id=${n.nodeID}`;
  const istrs = n.instructions.map((i) => instrToString(i)).join(', ');
  const idxs = n.instructionsIndexes.map((i) => `${i}`).join(', ');
  const edgesStr = n.edges
    .map((e) => {
      const s1 = instrToString(e.instrFrom);
      const s2 = instrToString(e.instrTo);
      return `${s1} -> ${s2}`;
    })
    .join(', ');

  return `${s} {\n instrs:[${istrs}],\nidxs:[${idxs}],\nedges:[${edgesStr}]}`;
}

function mergeNodes(g: Graph, n1Address: number, n2Address: number): void {
  console.log(`merging nodes from addr1 ${n1Address} and ${n2Address}`);
  const n1 = getNode(g, n1Address);
  const n2 = getNode(g, n2Address);
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
    console.error(`Attempting to merge the same nodes`);
    const n1s = nodeToStr(n1);
    const n2s = nodeToStr(n2);
    console.error(`Node 1 ${n1s}`);
    console.error(`Node 2 ${n2s}`);
    throw new Error(`Attempting to merge the same node`);
  }
  console.log(`nodeFrom ${nodeToStr(n1)}`);
  console.log(`nodeTo ${nodeToStr(n2)}`);

  const edges = n1.edges.concat(n2.edges);
  const indexes = n1.instructionsIndexes.concat(n2.instructionsIndexes);
  const insts = n1.instructions.concat(n2.instructions);
  const nodeID = n1.nodeID < n2.nodeID ? n1.nodeID : n2.nodeID;
  const mergedNode = createNode(nodeID, false, insts, indexes, edges);

  for (let i = 0; i < mergedNode.instructions.length; i++) {
    const instr = mergedNode.instructions[i];
    g.set(instr.startAddress, mergedNode);
  }

  console.log(`MergedNode ${nodeToStr(mergedNode)}`);
}

function buildCFGForFunc(fun: WASMFunction): [CFGNode, Graph] {
  const g: Graph = new Map();
  for (let i = 0; i < fun.allInstructions.length; i++) {
    const instr = fun.allInstructions[i];
    const instrChangesFlow =
      isControlFlowInstruction(instr) || isWasmInstructionBlockBased(instr);
    const n = createNode(i, instrChangesFlow, [instr], [i], []);
    g.set(instr.startAddress, n);
  }
  console.log(`Building CFG for function ${fun.id}`);
  buildCFGNodesHelper(g, fun.body, [
    {
      startBlockInstruction: fun.body[0],
      instructionAfterBlock: fun.body[fun.body.length - 1],
    },
  ]);
  const entryNode = getNode(g, fun.allInstructions[0].startAddress);
  return [entryNode, g];
}

function instrToString(inst: WasmInstruction, index?: number): string {
  let str = `'(startAddr ${inst.startAddress}, endAddr ${inst.endAddress}) ${inst.name} ${inst.immediate} ${inst.args}'`;
  if (index !== undefined) {
    str = `idx ${index} ` + str;
  }
  return str;
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
    const instStr = instrToString(instr);
    if (
      !isControlFlowInstruction(instr) &&
      !isWasmInstructionBlockBased(instr)
    ) {
      if (entryAddress === undefined) {
        entryAddress = instr.startAddress;
        continue;
      }

      const entryNode = getNode(g, entryAddress);
      const entryNodeInstr = lastInstruction(entryNode);
      const entryInstrStr = instrToString(entryNodeInstr);
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

      console.log(
        `update entry Addr from ${entryAddress} to ${instr.startAddress}`,
      );
      entryAddress = instr.startAddress;
    }

    if (isControlFlowInstruction(instr)) {
      if (isBranchIf(instr) || isBranch(instr)) {
        const kindBranch = isBranchIf(instr) ? 'branch_if' : 'branch';
        console.log(
          `Istr ${instStr} is ${kindBranch} to target ${instr.brachTarget}`,
        );
        const scopeIdx = instr.brachTarget + 1;
        const targetBlock = blockScopes[blockScopes.length - scopeIdx];
        const targetBlockInstr = targetBlock.startBlockInstruction;
        const targetStr = instrToString(targetBlockInstr);
        const afterBlockInstr = targetBlock.instructionAfterBlock;
        const afterBlockInstrStr = instrToString(afterBlockInstr);
        console.log(
          `Branching to first instruction of block instruction ${targetStr} or next instruction ${afterBlockInstrStr}`,
        );

        if (isBranch(instr)) {
          console.log(
            `instr ${instStr} is branch so we remove all edges and keep the one to where the branch occurs`,
          );
          const branchNode = getNode(g, instr.startAddress);
          branchNode.edges = [];
        }

        if (isLoopInstruction(targetBlockInstr)) {
          console.log(
            `TargetBlock is a Loop block so add edge from ${instStr} to first instruction of loop`,
          );
          const firstLoopInstr = targetBlockInstr.subInstructions[0];
          console.log(`FirstLoop isntrc is ${instrToString(firstLoopInstr)}`);
          addEdge(g, instr.startAddress, firstLoopInstr.startAddress);
        } else {
          console.log(
            `TargetBlock is a normal block so add edge from ${instStr} to first instruction after block ${afterBlockInstrStr}`,
          );
          addEdge(g, instr.startAddress, afterBlockInstr.startAddress);
        }
        console.log(`continue`);
        continue;
      } else if (instr.opcodeNr === WASMOpcodeNumber.Br_table) {
        throw new Error(`TODO add backedges for BR_table case`);
      } else if (isReturnBranch(instr)) {
        console.log(`Return branch will cause to go to the outerblock`);
        const targetBlock = blockScopes[0];
        const afterBlockInstr = targetBlock.instructionAfterBlock;
        const afterBlockInstrStr = instrToString(afterBlockInstr);
        console.log(
          `Will add an edge from ${instStr} to the last instruction of the outermost block which is stored in afterBlockInstr  and is ${afterBlockInstrStr}`,
        );
        addEdge(g, instr.startAddress, afterBlockInstr.startAddress);
      } else {
        console.log(
          `Istr ${instStr} is a call or callindirect nothing else to do`,
        );
        console.log(`continue`);
        continue;
      }
    }

    console.log(`Istr is block instr so navigate to subinstructions`);
    // case where instr is a block based structure instr
    // the end isntruction of the block instr is the last inst of its subisntrcs
    // the next inst of instructions as instructions[i+1] is the inst after the block'end
    const instrAfterBlock = instructions[i + 1];
    const instrAfterBlockStr = instrToString(instrAfterBlock);
    console.log(`Instr after ${instStr} is ${instrAfterBlockStr}`);
    const endBlockAddr = instrAfterBlock.startAddress;
    const newScopes = blockScopes.slice(); // copy
    newScopes.push({
      startBlockInstruction: instr,
      instructionAfterBlock: instrAfterBlock,
    });
    if (isIfInstruction(instr)) {
      console.log(`Instr is if so explore consequence and alternative`);
      console.log(
        `Build subgraph for consequence instrs where entrynode is ${instStr} and exitNode ${instrAfterBlockStr}`,
      );
      buildCFGNodesHelper(
        g,
        instr.consequentInstructions,
        newScopes,
        instr.startAddress,
        endBlockAddr,
      );
      console.log(`Completed consequence of ${instStr} looking at alternative`);
      if (instr.hasAlternativeBlock()) {
        console.log(
          `Build subgraph for alternative instrs where entrynode is ${instStr} and exitNode ${instrAfterBlockStr}`,
        );
        buildCFGNodesHelper(
          g,
          instr.alternateInstructions,
          newScopes,
          instr.startAddress,
          endBlockAddr,
        );
        console.log(
          `Completed alternative of ${instStr} where exitNode is ${instrAfterBlockStr}`,
        );
      } else {
        console.log(
          `${instStr} has no alternative so add edge to ${instrAfterBlockStr}`,
        );
        // No alternative block so add edge between if and nextExitAddr
        addEdge(g, instr.startAddress, endBlockAddr);
      }
    } else {
      console.log(
        `Instr ${instStr} is a block or loop so explore subinstructions`,
      );
      console.log(
        `Exploring subIstructions where ${instStr} is entryAddr and exitAddress is ${instrAfterBlockStr}`,
      );
      // instr is block or loop
      buildCFGNodesHelper(
        g,
        instr.subInstructions,
        newScopes,
        instr.startAddress,
        endBlockAddr,
      );
      console.log(
        `Finished exploring subIstructions of ${instStr} where ${instStr} is entryAddr and exitAddress is ${instrAfterBlockStr}`,
      );
    }
    // skip endAddress of block as it has already been handled
    console.log(
      `entryAddress ${entryAddress} becomes the next address of ${instStr}  i.e., ${instrAfterBlockStr}`,
    );
    entryAddress = endBlockAddr;
    i = i + 1;
    console.log(`And i incremented to ${i}`);
  }

  console.log(
    `Finished all instructions where entryAddress is ${entryAddress} and exitAddress ${exitAddress}`,
  );
  if (exitAddress !== undefined) {
    if (entryAddress === undefined) {
      throw new Error(
        'Entry address is not expected to be undefined when reaching end',
      );
    }

    const ne = getNode(g, entryAddress);
    const instrEntry = lastInstruction(ne);
    const s1 = instrToString(instrEntry);
    const na = getNode(g, exitAddress);
    const instrExit = lastInstruction(na);
    const s2 = instrToString(instrExit);
    console.log(
      `Adding last edge from the last node with address ${entryAddress} ${s1} to exitAddress node with address ${exitAddress} ${s2}`,
    );
    addEdge(g, entryAddress, exitAddress);
  }
}
