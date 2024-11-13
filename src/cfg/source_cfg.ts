import { breadthFirstTraverseWasmCFGT } from './traversals_cfg';
import {
  type WasmGraph,
  type CFGNode,
  type WasmControlFlowGraph,
  getWasmCFGNode,
  type WASMFunGraph,
} from './wasm_cfg';
// import { createLogger } from '../logger/logger';
import {
  equalSourceCodeLocations,
  type SourceCodeLocation,
  type SourceMap,
} from '../source_mappers/source_map';
import {
  isBranchingInstruction,
  isCallIndirect,
  isCallInstruction,
  isWasmInstructionBlockBased,
  instructionToString,
  type WasmInstruction,
  type CallInstruction,
  type CallIndirect,
} from '../webassembly/wasm/wasm_instruction';
import {
  type AgnosticASTMap,
  type AgnosticNode,
} from '../language_adaptors/agnostic_node';
import {
  getFileName,
  isFilePath,
  pathJoin,
  sanitizeFilename,
} from '../util/file_util';
import { sourceControlFlowGraphToDot } from './dot_serialize';
import { writeFileSync } from 'fs';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import { createLogger } from '../logger/logger';
import path from 'path';

const logger = createLogger('ASTControlFlowGraph');
export interface DotSerializationConfgig {
  includeInstructions: boolean;
  includeEmptySCFG: boolean;
  funIds?: number[];
}

export class SourceControlFlowGraph {
  private readonly _astGraphs: Map<number, FunctionSourceCFG>;
  private readonly _allGraphNodes: SourceCFGNode[];
  private readonly _sourceMap: SourceMap;
  private readonly _wasmCFG: WasmControlFlowGraph;

  constructor(
    asts: AgnosticASTMap,
    sourceMap: SourceMap,
    cfg: WasmControlFlowGraph,
  ) {
    this._sourceMap = sourceMap;
    this._wasmCFG = cfg;
    this._astGraphs = buildSourceCFGraph(sourceMap, cfg);
    let allnodes: SourceCFGNode[] = [];
    for (const funGraph of this._astGraphs.values()) {
      allnodes = allnodes.concat(funGraph.allNodes);
    }
    this._allGraphNodes = allnodes;
  }

  get sourceMap(): SourceMap {
    return this._sourceMap;
  }

  get wasmCFG(): WasmControlFlowGraph {
    return this._wasmCFG;
  }

  nodesFromAddress(addr: number): SourceCFGNode | undefined {
    const filtered = this._allGraphNodes.filter(
      (n) => n.instructions.find((i) => i.startAddress === addr) !== undefined,
    );
    if (filtered.length > 1) {
      throw new Error(
        `Found #${filtered.length} nodes for the same Wasm address ${addr}`,
      );
    }

    if (filtered.length === 1) {
      return filtered[0];
    } else {
      return undefined;
    }
  }

  nodesFromSourceLoc(location: SourceCodeLocation): SourceCFGNode[] {
    logger.debug(
      `get genereatedPosition for Location {${location.source}, ${location.linenr}, ${location.colnr}}`,
    );
    const mappings = this._sourceMap.generatedPositionFor(location);
    logger.debug(
      `#${mappings.lastIndexOf} mappings found for Location {${location.source}, ${location.linenr}, ${location.colnr}}`,
    );
    const nodes: SourceCFGNode[][] = [];
    for (const m of mappings) {
      const ns = this.nodesFromAddress(m.address);
      if (ns !== undefined) {
        logger.debug(
          `node found for addr ${m.address} for Location {${location.source}, ${location.linenr}, ${location.colnr}}`,
        );
        nodes.push([ns]);
      }
    }

    if (nodes.length > 1) {
      // console.log(`More than one set of nodes found ignoring the rest`);
      return nodes[0];
    } else if (nodes.length === 1) {
      return nodes[0];
    } else {
      return [];
    }
  }

  getFuntionSourceCFG(fid: number): FunctionSourceCFG | undefined {
    return this._astGraphs.get(fid);
  }

  getFunctionEntryNodes(fid: number): SourceCFGNode[] {
    const f = this.getFuntionSourceCFG(fid);
    if (f === undefined) {
      return [];
    }

    return f.entryNodes;
  }

  allNodes(): SourceCFGNode[] {
    return this._allGraphNodes;
  }

  getFunctionEntryNodesFromNode(n: SourceCFGNode): SourceCFGNode[] {
    const entryNodes: SourceCFGNode[] = [];
    const alreadyAdded = new Set<number>();
    if (sourceCFGHasOutgoingFunCallEdges(n)) {
      const callInstr = getCallInstructions(n);
      for (const i of callInstr) {
        if (isCallInstruction(i)) {
          const graphi = this._astGraphs.get(i.funIdx);
          if (graphi === undefined) {
            // this can happen if funIDX is an imported env fun
            // or a function for which no source file is available
            continue;
          }
          graphi.entryNodes.forEach((n) => {
            if (!alreadyAdded.has(n.nodeId)) {
              entryNodes.push(n);
              alreadyAdded.add(n.nodeId);
            }
          });
        } else {
          throw new Error(
            `instruction ${instructionToString(i)} is not a call function`,
          );
        }
      }
    }
    return entryNodes;
  }

  getNodeNeighbours(
    n: SourceCFGNode,
    ignoreExitNodes: boolean = false,
  ): SourceCFGNode[] {
    const alreadyAdded = new Set<number>();
    const ns: SourceCFGNode[] = [];
    for (const [e] of n.edges) {
      if (!alreadyAdded.has(e.nodeId)) {
        ns.push(e);
        alreadyAdded.add(e.nodeId);
      }
    }
    if (!ignoreExitNodes && sourceCFGHasOutgoingFunCallEdges(n)) {
      this.getFunctionEntryNodesFromNode(n).forEach((en) => {
        if (!alreadyAdded.has(en.nodeId)) {
          ns.push(en);
          alreadyAdded.add(en.nodeId);
        }
      });
    }
    return ns;
  }

  serializeToDot(outputDir: string, config: DotSerializationConfgig): string[] {
    const funIds = config.funIds ?? [];
    if (funIds.length === 0) {
      this._sourceMap.wasm.functions.forEach((f) => funIds.push(f.id));
    }

    const seenDotFileNames = new Set<string>();
    const dots: string[] = [];
    for (const fid of funIds) {
      const fg = this.getFuntionSourceCFG(fid);
      if (fg === undefined || fg.entryNodes.length === 0) {
        continue;
      }
      if (fg?.allNodes !== undefined) {
        const fun = this.sourceMap.wasm.getFunction(fid);
        if (fun === undefined) {
          throw new Error(`Fun is not supposed to be empty`);
        }
        let funName = fun.name === '' ? 'source' : fun.name;
        funName = funName.trim();
        funName = sanitizeFilename(`${funName}_fun${fid}`);

        if (seenDotFileNames.has(funName)) {
          funName = `${funName}${fid}`;
          if (seenDotFileNames.has(funName)) {
            throw new Error(
              `Case where two dot files share same name i.e., ${funName}`,
            );
          }
        }
        seenDotFileNames.add(funName);
        const content = sourceControlFlowGraphToDot(
          fg,
          funName,
          config.includeInstructions,
        );
        const p = pathJoin(outputDir, `${funName}.dot`);
        writeFileSync(p, content);
        dots.push(content);
      }
    }
    return dots;
  }

  toJSON(outputDir?: string): string {
    const fgs: Array<{
      funID: number;
      graph: object;
    }> = [];
    for (const f of this._sourceMap.wasm.functions) {
      const g = this._astGraphs.get(f.id);
      if (g !== undefined) {
        fgs.push({
          funID: f.id,
          graph: functionTreeGraphToJSONObj(g),
        });
      }
    }

    const content: object = {
      wasmPath: this._sourceMap.wasm.wasmPath,
      graphs: fgs,
    };

    const json = JSON.stringify(content);
    if (outputDir !== undefined) {
      const includeExtension = false;
      const fn = getFileName(this._sourceMap.wasm.wasmPath, includeExtension);
      const destinationPath = path.join(outputDir, `${fn}.source.json`);
      writeFileSync(destinationPath, json);
    }
    return json;
  }
}

export interface SourceCFGNode {
  nodeId: number;
  node?: AgnosticNode;
  sourceLocation: SourceCodeLocation;
  edges: Array<[SourceCFGNode, WasmInstruction, WasmInstruction]>;
  wasmFunOwner: number;
  instructions: WasmInstruction[];
  instructionsIndexes: number[];
  incomingEdges: Array<[SourceCFGNode, WasmInstruction, WasmInstruction]>;
}

function sourceCFGNodeToJSONObj(n: SourceCFGNode): object {
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

export function sourceCFGHasOutgoingFunCallEdges(n: SourceCFGNode): boolean {
  // TODO improve speed
  return getCallInstructions(n).length > 0;
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

// TODO rename
export interface FunctionSourceCFG {
  entryNodes: SourceCFGNode[];
  allNodes: SourceCFGNode[];
  exitNodes: SourceCFGNode[];
}

function functionTreeGraphToJSONObj(f: FunctionSourceCFG): object {
  return {
    entryNodes: f.entryNodes.map((en) => en.nodeId),
    allNodes: f.allNodes.map((en) => sourceCFGNodeToJSONObj(en)),
  };
}

function buildSourceCFGraph(
  sourceMap: SourceMap,
  // asts: AgnosticASTMap,
  cfg: WasmControlFlowGraph,
): Map<number, FunctionSourceCFG> {
  logger.debug(
    `Building Source Level Control Flow Graph for #${sourceMap.wasm.functions.length}`,
  );
  const ctg = new Map<number, FunctionSourceCFG>();
  const funcs = sourceMap.wasm.functions;
  for (let idx = 0; idx < funcs.length; idx++) {
    const f = funcs[idx];
    logger.debug(
      `[${idx}/${funcs.length - 1}] Building SCFG for function ${f.id}`,
    );
    const funGraph = binaryLiftWasmCFG(f, sourceMap, cfg);
    logger.debug(
      `[${idx}/${funcs.length - 1}] Storing SCFG of function ${f.id} to Map`,
    );
    ctg.set(f.id, funGraph);
  }
  return ctg;
}

function binaryLiftWasmCFG(
  f: WASMFunction,
  sourceMap: SourceMap,
  cfg: WasmControlFlowGraph,
): FunctionSourceCFG {
  const graph = cfg.getCFGStrict(f.id);
  const ns = visitWasmNodes(f.id, sourceMap, graph);
  logger.debug(
    `${ns.length === 0 ? 'No edges to add' : 'Adding Edges'} for function ${f.id}`,
  );
  const entryNodes = ns.length === 0 ? [] : visitWasmEdges(graph, ns);
  logger.debug(`Found #${entryNodes.length} EntryNodes for function ${f.id}`);
  return { entryNodes, allNodes: ns };
}

// function logNode(n: AgnosticNode): string {
//   const sp = n.startPosition;
//   const ep = n.endPosition;
//   return `{startLoc: (${sp.linenr}, ${sp.colnr}), endLoc: (${ep.linenr}, ${ep.colnr}), srcTxt: '${n.node.text}'}`;
// }

function visitWasmNodes(
  funID: number,
  sourceMap: SourceMap,
  funGraph: WASMFunGraph,
): SourceCFGNode[] {
  logger.debug(`Creating all nodes for ${funID}`);
  const entryNode = funGraph.entryNode;
  const g = funGraph.graph;
  const nodes: SourceCFGNode[] = [];

  breadthFirstTraverseWasmCFGT(g, entryNode, {
    onNode: (n: CFGNode) => {
      let prevNode: SourceCFGNode | undefined;
      for (let i = 0; i < n.instructions.length; i++) {
        const instr = n.instructions[i];
        const sourceLocations = sourceMap
          .getOriginalPositionFor(instr.startAddress)
          .filter((s) => {
            return isFilePath(s.source);
          });

        if (sourceLocations.length > 1) {
          throw new Error(
            `more than one source location found for addr ${instr.startAddress}`,
          );
        } else if (sourceLocations.length === 0) {
          continue;
        }
        const sourceLocation = sourceLocations[0];
        const node = createNodeIfNeeded(
          funID,
          nodes,
          sourceLocation,
          instr,
          n.instructionsIndexes[i],
          prevNode,
        );

        if (prevNode !== undefined && prevNode.nodeId !== node.nodeId) {
          addEdge(
            prevNode,
            prevNode.instructions[prevNode.instructions.length - 1],
            node,
            node.instructions[0],
          );
        }
        prevNode = node;
      }
    },
  });

  return nodes;
}

/**
 * A helper func that given a `n` Wasm CFG Node will retrieve its binary lifted Source Level CFG Node.
 * The search for the Source Level CFG Node will happen by searching in decreasing order
 * the Source Level node associated to each Wasm instruction beloning to `n`.
 * @param n Wasm CFG node
 * @param nodes source level CFG nodes
 * @returns Source Level CFG and Wasm Instruction
 */
function sourceCFGNodeAndInstrFromDecrInstrAddrs(
  n: CFGNode,
  nodes: SourceCFGNode[],
): [SourceCFGNode, WasmInstruction] | undefined {
  const increment = false;
  return searchSourceCFGNode(n, nodes, increment);
}

/**
 * A helper func that given a `n` Wasm CFG Node will retrieve its binary lifted Source Level CFG Node.
 * The search for the Source Level CFG Node will happen by searching in increasing order
 * the Source Level node associated to each Wasm instruction beloning to `n`.
 * @param n Wasm CFG node
 * @param nodes source level CFG nodes
 * @returns Source Level CFG and Wasm Instruction
 */
function sourceCFGNodeAndInstrFromIncrInstrAddrs(
  n: CFGNode,
  nodes: SourceCFGNode[],
): [SourceCFGNode, WasmInstruction] | undefined {
  const increment = true;
  return searchSourceCFGNode(n, nodes, increment);
}

function searchSourceCFGNode(
  n: CFGNode,
  nodes: SourceCFGNode[],
  fromLowAddressToHigh: boolean,
): [SourceCFGNode, WasmInstruction] | undefined {
  let startIndex = fromLowAddressToHigh ? 0 : n.instructions.length - 1;
  const endIndex = fromLowAddressToHigh ? n.instructions.length : 0;

  while (true) {
    if (fromLowAddressToHigh) {
      if (startIndex >= endIndex) {
        break;
      }
    } else {
      if (startIndex < endIndex) {
        break;
      }
    }
    const instr = n.instructions[startIndex];
    const ns: Array<[SourceCFGNode, WasmInstruction]> = [];
    for (const n of nodes) {
      const i = n.instructions.find(
        (ni) => ni.startAddress === instr.startAddress,
      );
      if (i !== undefined) {
        ns.push([n, i]);
      }
    }
    if (ns.length > 1) {
      throw new Error(`found address as part of multiple AST nodes`);
    } else if (ns.length === 1) {
      return ns[0];
    }

    if (fromLowAddressToHigh) {
      startIndex += 1;
    } else {
      startIndex -= 1;
    }
  }
  return undefined;
}

/**
 * This function will add missing edges to the Source Level CFG by looking at the edges
 * of its corresponding Wasm Level CFG.
 * After adding the edges the function also returns the entry nodes of the Source Level CFG.
 * @param funGraph the CFG of the wasm function
 * @param sourceNodes Source Level CFG nodes that need to be augmented with edges
 * @returns the Entry nodes of the Source Level CFG
 */
function visitWasmEdges(
  funGraph: WASMFunGraph,
  sourceNodes: SourceCFGNode[],
): void {
  if (sourceNodes.length === 0) {
    return;
  }

  const g = funGraph.graph;
  const wasmNodesToIgnore: Set<number> = new Set<number>();
  breadthFirstTraverseWasmCFGT(g, funGraph.entryNode, {
    onNode: (wasmNode: CFGNode) => {
      const found = sourceCFGNodeAndInstrFromDecrInstrAddrs(
        wasmNode,
        sourceNodes,
      );
      if (found === undefined) {
        return;
      }

      // case where we check if maybe we have to add edges which can happen when:
      // 1. the fromInstruction of the wasm cfg node and the toInstruct belong to
      // two different source CFG nodes
      // 2. in the case that the fromInstr and toInstr belong to the same source CFG node cfgn
      // then adding an edge may not be needed:
      // 2.a. if there is just one edge then toInstr of the wasm CFG node is a
      // block instr (e.g., block or loop) and no edge is needed to be added
      // 2.b if the toInstr is a call or indirect call the corresponding Source CFG Node no edge
      // needs to be added. This call node simply indicates that when applying debug operations
      // and when encountering this call node another Source CFG has to be accessed.
      // 2.c. if the toInstr is a branching instruction (e.g., br, br_if, br_table) and edge may
      // need to be added. And this depending on where the toInstr points to. However,
      // this case 2.c can be handled on the next node visit which in that case should be the
      // the first condition to check
      // console.log(`Adding edges for node ${logNode(ctgn.node)}`);

      const [sourceCFGNFrom, fromInstr] = found;
      for (const e of wasmNode.edges) {
        const toWasmNode = getWasmCFGNode(g, e.instrTo.startAddress);
        const foundToNodeAndInstr = sourceCFGNodeAndInstrFromIncrInstrAddrs(
          toWasmNode,
          sourceNodes,
        );

        if (foundToNodeAndInstr !== undefined) {
          const [toSourceCFGNode, toInstr] = foundToNodeAndInstr;

          if (sourceCFGNFrom.nodeId !== toSourceCFGNode.nodeId) {
            // case 1
            addEdge(sourceCFGNFrom, fromInstr, toSourceCFGNode, toInstr);
          } else if (isWasmInstructionBlockBased(e.instrTo)) {
            // case 2.a
            continue;
          } else if (
            isCallInstruction(e.instrTo) ||
            isCallIndirect(e.instrTo)
          ) {
            // case 2.b
            // console.log(
            //   `mark node ${ctgn.nodeId} as a node with an edge to an outside call`,
            // );
            continue;
          } else if (isBranchingInstruction(e.instrFrom)) {
            // case 2.c
            // TODO generalise to paths
            const branchingNode = getWasmCFGNode(g, e.instrFrom.startAddress);
            for (const be of branchingNode.edges) {
              const destWasmNode = getWasmCFGNode(g, be.instrTo.startAddress);
              const foundDestSourceAndInstr =
                sourceCFGNodeAndInstrFromIncrInstrAddrs(
                  destWasmNode,
                  sourceNodes,
                );
              if (foundDestSourceAndInstr === undefined) {
                throw new Error(`TODO search deeper in patch`);
              } else {
                const [destSourceNode, destInstr] = foundDestSourceAndInstr;
                addEdge(sourceCFGNFrom, fromInstr, destSourceNode, destInstr);
              }
            }
          } else {
            continue;
          }
        } else {
          // we have to search for all the neighbours of toNode that have a CFG node
          const [indirectNodes, newWasmNodesToIngore] =
            closetsChildrenSourceCFGNodes(g, toWasmNode, sourceNodes);
          newWasmNodesToIngore.forEach((nid) => wasmNodesToIgnore.add(nid));
          for (const [indirectCTGN, indirectInstr] of indirectNodes) {
            addEdge(sourceCFGNFrom, fromInstr, indirectCTGN, indirectInstr);
          }
        }
      }
    },
  });
}

/**
 * A helper function that given a node in a Wasm CFG of a function will search direct
 * or indirect Source Level CFG neighbours.
 * This function is needed in the situation where `n` has no corresponding source Level CFG Node but
 * the parent node of `n` i.e., node p that has an edge to n, does have a corresponding source level CFG Node
 * and thus wants to add an edge to the source level nodes that are the closets to `n`.
 * These closests source level CFG nodes for `n` are the source nodes that are direct neighbours of n or
 * indirect neighbours.
 *
 * @param g Wasm Level CFG of a Wasm function
 * @param n a node in the Wasm CFG for which we want to find the closests Source Level CFG Nodes
 * @param nodes All the Source Level CFGNodes
 * @param nodesToIgnore a set of already visited node ids. This prevents to loop infinitly.
 * @returns nodes IDs that no longer need to be visited after return and the closets nodes
 */
function closetsChildrenSourceCFGNodes(
  g: WasmGraph,
  n: CFGNode,
  nodes: SourceCFGNode[],
  nodesToIgnore = new Set<number>(),
): [Array<[SourceCFGNode, WasmInstruction]>, Set<number>] {
  logger.debug(`Node ${n.nodeID} has no Source CFGNode`);
  if (nodesToIgnore.has(n.nodeID)) {
    // consider scenario n1 -> n2 -> n3
    //                            -> n4 -> n2
    // if we assume that node n2 and n4 have no source level CFGNodes
    // then the risk exist that the search for the closests source CFGNodes
    // loops forever due to the backedge from n4 to n2
    // to prevent this we need to keep track of the already visited nodes
    // that solves the callstack exhaustion issue

    // this can also occur when encountering self loops
    // consider n1 -> n2 -> n3 and n2-> n2
    // n2 has a self edge and no source level CFG
    //
    // when this function is called for n2 because of the self edge
    // then the call is stoped given that the id of n2 is
    // stored in the nodesToIgnore
    return [[], nodesToIgnore];
  }

  nodesToIgnore.add(n.nodeID);
  const closests: Array<[SourceCFGNode, WasmInstruction]> = [];
  for (const e of n.edges) {
    const toWasmNode = getWasmCFGNode(g, e.instrTo.startAddress);
    const found = sourceCFGNodeAndInstrFromIncrInstrAddrs(toWasmNode, nodes);
    if (found === undefined) {
      const [ns, newNodesToIngore] = closetsChildrenSourceCFGNodes(
        g,
        toWasmNode,
        nodes,
        nodesToIgnore,
      );
      newNodesToIngore.forEach((nodeid) => nodesToIgnore.add(nodeid));
      ns.forEach((nf) => closests.push(nf));
    } else {
      closests.push(found);
    }
  }
  return [closests, nodesToIgnore];
}

function createNodeIfNeeded(
  funID: number,
  nodes: SourceCFGNode[],
  sourceLocation: SourceCodeLocation,
  instrToAdd: WasmInstruction,
  instrIndex: number,
  parentNode: SourceCFGNode | undefined,
): SourceCFGNode {
  let ncfg = findNode(nodes, instrToAdd);
  if (ncfg === undefined) {
    if (
      parentNode === undefined ||
      !equalSourceCodeLocations(parentNode.sourceLocation, sourceLocation)
    ) {
      ncfg = {
        wasmFunOwner: funID,
        nodeId: instrToAdd.startAddress,
        sourceLocation,
        edges: [],
        instructions: [],
        instructionsIndexes: [],
        incomingEdges: [],
      };
      nodes.push(ncfg);
    } else {
      ncfg = parentNode;
    }
  }
  ncfg.instructions.push(instrToAdd);
  ncfg.instructionsIndexes.push(instrIndex);
  if (ncfg.instructions.length > 1) {
    ncfg.instructions.sort((i1, i2) => i1.startAddress - i2.startAddress);
    ncfg.instructionsIndexes.sort((i1, i2) => i1 - i2);
    // update node id to addr of first instr
    ncfg.nodeId = ncfg.instructions[0].startAddress;
  }
  return ncfg;
}

function tmpMergeNodeName(n1: SourceCFGNode, n2: SourceCFGNode): void {
  // if (
  //   prevNode === undefined ||
  //   !equalSourceCodeLocations(prevNode.sourceLocation, sourceLocation)
  // ) {
  //   ncfg = {
  //     wasmFunOwner: funID,
  //     nodeId: `${instrToAdd.startAddress}`,
  //     sourceLocation,
  //     edges: [],
  //     instructions: [],
  //     instructionsIndexes: [],
  //   };
  //   nodes.push(ncfg);
  // } else {
  //   ncfg = prevNode;
  // }
}

function findNode(
  nodes: SourceCFGNode[],
  instr: WasmInstruction,
): SourceCFGNode | undefined {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const foundInstr = n.instructions.find((i) => {
      if (i.startAddress === instr.startAddress) {
        if (i.endAddress !== instr.endAddress) {
          throw new Error(
            `Found two Wasm instr with same start address yet different end address: instr 1 ${instructionToString(i)} and instr 2 ${instructionToString(instr)}`,
          );
        }
        return true;
      }
      return false;
    });
    if (foundInstr !== undefined) {
      return n;
    }
  }
  return undefined;
}

function addEdge(
  an1: SourceCFGNode,
  fromInstr: WasmInstruction,
  an2: SourceCFGNode,
  toInstr: WasmInstruction,
): void {
  const alreadyAdded = an1.edges.find(([n]) => {
    return n.nodeId === an2.nodeId;
  });
  if (alreadyAdded === undefined) {
    an1.edges.push([an2, fromInstr, toInstr]);
    an2.incomingEdges.push([an1, fromInstr, toInstr]);
  }
}
