import { writeFileSync } from 'fs';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import {
  type CallInstruction,
  type WasmInstruction,
  isControlFlowInstruction,
  isWasmInstructionBlockBased,
  isBranch,
  isBranchIf,
  isLoopInstruction,
  isReturnBranch,
  isIfInstruction,
  instructionToString,
  isCallInstruction,
  isCallIndirect,
  isBranchTable,
  isConst,
  type CallIndirect,
  isTableSet,
} from '../webassembly/wasm/wasm_instruction';
import { type WasmModule } from '../webassembly/wasm/wasm_module';
import { wasmControlFlowGraphToDot } from './dot_serialize';
import path from 'path';
import { getFileName } from '../util/file_util';

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
  entryNode: CFGNode;
  graph: WasmGraph;
  calls: CallInstruction[];
  callIndirects: CallIndirect[];
}

function cfgNodeToObj(nd: CFGNode): object {
  return {
    nodeID: nd.nodeID,
    changesFlow: nd.changesFlow,
    startAddress: nd.startAddress,
    endAddress: nd.endAddress,
    instructions: nd.instructions.map((i) => i.toJSONObj()),
    instructionsIndexes: nd.instructionsIndexes,
    edges: nd.edges.map((e) => edgeToJSONObj(e)),
  };
}

function edgeToJSONObj(e: CFGEdge): object {
  return {
    instrFrom: e.instrFrom.toJSONObj(),
    instrTo: e.instrTo.toJSONObj(),
  };
}

function wasmFuncGraphToJSONObj(f: WASMFunGraph): object {
  const g: Array<{
    wasmAddr: number;
    node: object;
  }> = [];
  for (const [wasmAddr, nd] of f.graph.entries()) {
    g.push({
      wasmAddr,
      node: cfgNodeToObj(nd),
    });
  }
  return {
    entryNode: cfgNodeToObj(f.entryNode),
    graph: g,
    calls: f.calls.map((c) => c.toJSONObj()),
    callIndirects: f.callIndirects.map((c) => c.toJSONObj()),
  };
}

export class WasmControlFlowGraph {
  private readonly _wasm: WasmModule;
  private readonly _cfgs: Map<number, WASMFunGraph>;
  private readonly _callSites: Map<number, Set<number>>;

  constructor(wasm: WasmModule) {
    this._wasm = wasm;
    this._cfgs = new Map();
    this.buildGraphs();
    this._callSites = this.buildCallSites();
  }

  getCFG(funID: number): WASMFunGraph | undefined {
    return this._cfgs.get(funID);
  }

  callSites(funID: number): Set<number> {
    return this._callSites.get(funID) ?? new Set();
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

  toJSON(outputDir?: string): string {
    const funcsJSONs: object[] = [];
    for (const f of this._wasm.functions) {
      const cfg = this.getCFG(f.id);
      if (cfg === undefined) {
        continue;
      }
      const callsites: number[] = Array.from(this._callSites.get(f.id) ?? []);
      funcsJSONs.push({
        funID: f.id,
        graph: wasmFuncGraphToJSONObj(cfg),
        callSitesWasmAddrs: callsites,
      });
    }

    const c = {
      path: this._wasm.wasmPath,
      funcs: funcsJSONs,
    };

    const json = JSON.stringify(c);
    if (outputDir !== undefined) {
      const includeExtension = false;
      const fn = getFileName(this._wasm.wasmPath, includeExtension);
      const destinationPath = path.join(outputDir, `${fn}.wasm.json`);
      writeFileSync(destinationPath, json);
    }
    return json;
  }

  private buildGraphs(): void {
    let tableAltered: boolean = false;
    const fgs: WASMFunGraph[] = [];
    for (const f of this._wasm.functions) {
      const [fg, newTblAltered] = buildCFGForFunc(f, tableAltered);
      tableAltered = tableAltered || newTblAltered;
      this._cfgs.set(f.id, fg);
      fgs.push(fg);
    }
    this.setTargetFunctionForCallIndirects(fgs, tableAltered);
  }

  /**
   * This private function will ensure that each graph linked to a function
   * The callindirect instructions are marked to call the correct target function(s).
   * To do this the function expects a `tableAltered` argument that tells whether
   * the Wasm module for which the CFGs have been built has an instruciton that does
   * alter the table (e.g., table's content is changed).
   * This information drastically impacts the target functions of call_indirects
   *
   * @param fgs the Array of CFGS for each Wasm function
   * @param tableAltered Tells whether in the whole Wasm module we encountered an instruction that changes the table (size, or content)
   */
  private setTargetFunctionForCallIndirects(
    fgs: WASMFunGraph[],
    tableAltered: boolean,
  ): void {
    for (const fg of fgs) {
      for (const ci of fg.callIndirects) {
        if (tableAltered || !ci.hasTableIndex()) {
          // at this point either
          // 1. the table got altered due to a table.set instruction
          // 2. or the index used by the callIndirect instruction could not be determined
          // due to the lack of dataflow analysis
          //
          // conservatively, to ensure soundness, we assume for both cases that each
          // callIndirect may target each wasm function with matching signature
          // as the callindirect
          const funcs = this._wasm.functions.filter((f) => {
            return f.type.equals(ci.signature);
          });

          if (funcs.length === 0) {
            throw new Error(
              `Found no matching func that could be targeted by CallIndirect ${ci.startAddress} tbl index ${ci.tableIndex}`,
            );
          }

          ci.targetFuncs = funcs.map((f) => f.id);
        } else {
          // TODO if possible determine statically which func the callIndirect targets
          // now fallback to targeting all wasm funcs

          const funcs = this._wasm.functions.filter((f) => {
            return f.type.equals(ci.signature);
          });
          if (funcs.length === 0) {
            throw new Error(
              `Found no matching func that could be targeted by CallIndirect ${ci.startAddress} tbl index ${ci.tableIndex}`,
            );
          }
        }
      }
    }
  }

  private buildCallSites(): Map<number, Set<number>> {
    const callSitesMap = new Map<number, Set<number>>();

    for (const f of this._wasm.functions) {
      const fg = this.getCFGStrict(f.id);
      const indirectCalls: WasmInstruction[] = fg.callIndirects;
      const calls: WasmInstruction[] = indirectCalls.concat(fg.calls);
      for (const c of calls) {
        const funcsCalled: number[] = [];
        if (isCallInstruction(c)) {
          funcsCalled.push(c.funIdx);
        } else if (isCallIndirect(c)) {
          c.targetFuncs.forEach((tf) => funcsCalled.push(tf));
        } else {
          // should not happen
          throw new Error(`Encountered an non call or indirect call`);
        }

        for (const funIDCalled of funcsCalled) {
          const callSites = callSitesMap.get(funIDCalled) ?? new Set<number>();
          callSites.add(c.startAddress);
          callSitesMap.set(funIDCalled, callSites);
        }
      }
    }

    return callSitesMap;
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
  const tableAltered = false;
  const [graph] = buildCFGForFunc(fun, tableAltered);
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
    return;
    // throw new Error(`Attempting to merge the same node`);
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

function buildCFGForFunc(
  fun: WASMFunction,
  tableAltered: boolean,
): [WASMFunGraph, boolean] {
  const g: WasmGraph = new Map();
  const funsCalled: CallInstruction[] = [];
  const callIndirects: CallIndirect[] = [];
  for (let i = 0; i < fun.allInstructions.length; i++) {
    const instr = fun.allInstructions[i];
    const instrChangesFlow =
      isControlFlowInstruction(instr) || isWasmInstructionBlockBased(instr);
    const n = createNode(i, instrChangesFlow, [instr], [i], []);
    g.set(instr.startAddress, n);
    if (isCallInstruction(instr)) {
      funsCalled.push(instr);
    } else if (isCallIndirect(instr)) {
      const prevIdx = i - 1;
      if (prevIdx > 0) {
        // we can now the exact target func
        // of call indirect only
        // if the previous instr is a const
        const prevInstr = fun.allInstructions[prevIdx];
        if (isConst(prevInstr)) {
          instr.tableIndex = prevInstr.value;
        }
      }
      callIndirects.push(instr);
    } else if (isTableSet(instr)) {
      tableAltered = true;
    }
  }
  buildCFGNodesHelper(g, fun.body, [
    {
      startBlockInstruction: fun.body[0],
      instructionAfterBlock: fun.body[fun.body.length - 1],
    },
  ]);
  const entryNode = getWasmCFGNode(g, fun.allInstructions[0].startAddress);
  return [
    { entryNode, graph: g, calls: funsCalled, callIndirects },
    tableAltered,
  ];
}

interface BlockScope {
  startBlockInstruction: WasmInstruction;
  instructionAfterBlock: WasmInstruction;
}

/**
 * The following function will construct a CFG for a sequence of Wasm `instructions`.
 * The sequence of instructions could either be the instructions of the body of a function,
 * or the subinstructions of block based instructions such as `block`, `if` with its
 * consequence and alternative, and `loop`.
 *
 * As some instructions cause branching (e.g., `br`, `br_if`, `br_table`), the function
 * expects as argument an array of the outerBlocks `blockScopes` that point to potential
 * target destination for the branching instructions.
 *
 * if the instructions are subinstructions of an Wasm instruction e.g., the inner
 * instructions of a `loop` instruction then the function expects two additional
 * arguments `beforeAddress` and `afterAddress` that respectively point to a Wasm
 * instruction that comes before the `instructions` and after the `instructions`.
 * This is used to ensure that the CFG adds the edges to the nodes associated
 * with the `beforeAddress` and `afterAddress`.
 *
 * @param g graph that maps Wasm addresses to CFGNode
 * @param instructions Wasm instructions in sequence for which the CFG needs to be build
 * @param blockScopes the outer scopes
 * @param beforeAddress the addr of the Wasm instr that comes before the first instr of `instructions`
 * @param afterAddress the addr of the Wasm instr that comes after the last instr of `instructions`
 */
function buildCFGNodesHelper(
  g: Map<number, CFGNode>,
  instructions: WasmInstruction[],
  blockScopes: BlockScope[],
  beforeAddress?: number | undefined,
  afterAddress?: number | undefined,
): void {
  for (let i = 0; i < instructions.length; i++) {
    const instr = instructions[i];
    if (
      !isControlFlowInstruction(instr) &&
      !isWasmInstructionBlockBased(instr)
    ) {
      if (beforeAddress === undefined) {
        beforeAddress = instr.startAddress;
        continue;
      }

      const prevNode = getWasmCFGNode(g, beforeAddress);
      const entryNodeInstr = lastInstruction(prevNode);
      if (prevNode.changesFlow) {
        // We cannot update the edges of the previous node
        // if the node is an unconditional branch
        // the reason is because the edges already got set
        // by a previous loop iteration
        if (!isBranch(entryNodeInstr)) {
          addEdge(g, beforeAddress, instr.startAddress);
        }
      } else {
        mergeNodes(g, beforeAddress, instr.startAddress);
      }
      beforeAddress = instr.startAddress;
      continue;
    }

    // The following depicts two special cases:
    // (1) additional edges may be needed
    // between the current node and other nodes.
    // This happens for instance when the current instruction
    // is a branching instruction (e.g, `br`, `br_table`)
    // (2) the graph needs to be further constructed in
    // subinstructions of the current instructions.
    // For instance, when encountering a block based instruction
    // such as the `if` with its consequence and alternative
    // the graph needs to be further build by visitn the consequence
    // and alternative instructions

    // First add an edge between the prevNode and current Node
    // if needed
    if (beforeAddress !== undefined) {
      const prevNode = getWasmCFGNode(g, beforeAddress);
      const lastInstr = lastInstruction(prevNode);
      if (!isBranch(lastInstr)) {
        addEdge(g, beforeAddress, instr.startAddress);
      }
    }
    beforeAddress = instr.startAddress;

    if (isControlFlowInstruction(instr)) {
      // (1) case where additional edges may be needed for branching instructions
      // after adding the edges we need to continue to the next instruction

      if (isCallInstruction(instr) || isCallIndirect(instr)) {
        // if current instr is (indirect) call
        // nothing more needs to happen
      } else if (isBranchIf(instr) || isBranch(instr)) {
        // in this case we have to add additional edges from the current node
        // to the block where the branch targets

        // take the target block of the instr
        const scopeIdx = instr.brachTarget + 1;
        const targetBlock = blockScopes[blockScopes.length - scopeIdx];
        const targetBlockInstr = targetBlock.startBlockInstruction;
        const afterBlockInstr = targetBlock.instructionAfterBlock;

        if (isBranch(instr)) {
          // current node is an unconditional jump to the target block
          // hence other edges are not needed
          const branchNode = getWasmCFGNode(g, instr.startAddress);
          branchNode.edges = [];
        }

        // depending on the target block (e.g., loop)
        // (conditional) branching goes to either the first instruction
        // or last instruction of the target block
        if (isLoopInstruction(targetBlockInstr)) {
          const firstLoopInstr = targetBlockInstr.subInstructions[0];
          addEdge(g, instr.startAddress, firstLoopInstr.startAddress);
        } else {
          addEdge(g, instr.startAddress, afterBlockInstr.startAddress);
        }

        // TODO when instr is Branch do we really need to continue?
        // In theory the next instructions are not executed.
        // why the need for continue? Maybe break?
        continue;
      } else if (isBranchTable(instr)) {
        // edges need to be added from the current node
        // (i.e., the node linked to current instr)
        // to the all the blocks that this
        // table branch instr targets
        for (const i of instr.brachTargets) {
          const scodeIdx = blockScopes.length - (1 + i);
          const targetBlock = blockScopes[scodeIdx];
          const afterBlockInstr = targetBlock.instructionAfterBlock;
          addEdge(g, instr.startAddress, afterBlockInstr.startAddress);
        }
      } else if (isReturnBranch(instr)) {
        // a return instr changes the control
        // to the most outer scope
        // thus add edge to the last instr
        // of the outer scope
        const targetBlock = blockScopes[0];
        const afterBlockInstr = targetBlock.instructionAfterBlock;
        addEdge(g, instr.startAddress, afterBlockInstr.startAddress);
        // TODO if instr is return do we really need to continue or break?
        // the following instrs may no need to be added in cfg?
      } else {
        throw new Error(
          `encountered a non handled branching instr ${instructionToString(instr)}`,
        );
      }

      // continue to the next instruction
      // otherwise we end up in case 2 which
      // is only applicable for block based instructions
      // thus not the current instr
      continue;
    }

    // (2) The case where current instr is a block based instr
    // the cfg consturction needs to be proceeded in the
    // subinstructions of the current instr

    if (i + 1 >= instructions.length) {
      break;
    }

    // case where instr is a block based structure instr
    // the end instruction of the block instr is the last inst of its subisntrcs
    // the next inst of instructions as instructions[i+1] is the inst after the block'end

    // the instruction after the current instr
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
    beforeAddress = endBlockAddr;
  }

  if (afterAddress !== undefined) {
    if (beforeAddress === undefined) {
      throw new Error(
        'Entry address is not expected to be undefined when reaching end',
      );
    }
    addEdge(g, beforeAddress, afterAddress);
  }
}
