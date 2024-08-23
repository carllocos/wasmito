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
  type SourceCodeLocation,
  type SourceCodeLocation2,
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
import { getFileName, isFilePath, pathJoin } from '../util/file_util';
import { sourceControlFlowGraphToDot } from './dot_serialize';
import { writeFileSync } from 'fs';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import * as crypto from 'crypto';
import { createLogger } from '../logger/logger';
import path from 'path';

const logger = createLogger('ASTControlFlowGraph');
export interface DotSerializationConfgig {
  includeInstructions: boolean;
  includeEmptySCFG: boolean;
  funIds?: number[];
}

export class SourceControlFlowGraph {
  private readonly _astGraphs: Map<number, FunctionTreeGraph>;
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

  nodesFromSourceLoc(location: SourceCodeLocation2): SourceCFGNode[] {
    logger.debug(
      `get genereatedPosition for Location {${location.source}, ${location.linenr}, ${location.columnStart}}`,
    );
    const mappings = this._sourceMap.generatedPositionFor(location);
    logger.debug(
      `#${mappings.lastIndexOf} mappings found for Location {${location.source}, ${location.linenr}, ${location.columnStart}}`,
    );
    const nodes: SourceCFGNode[][] = [];
    for (const m of mappings) {
      const ns = this.nodesFromAddress(m.address);
      if (ns !== undefined) {
        logger.debug(
          `node found for addr ${m.address} for Location {${location.source}, ${location.linenr}, ${location.columnStart}}`,
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

  funtionSourceGraph(fid: number): FunctionTreeGraph | undefined {
    return this._astGraphs.get(fid);
  }

  getFunctionEntryNodes(fid: number): SourceCFGNode[] {
    const f = this.funtionSourceGraph(fid);
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
    const alreadyAdded = new Set<string>();
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
    const alreadyAdded = new Set<string>();
    const ns: SourceCFGNode[] = [];
    for (const e of n.edges) {
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

    const dots: string[] = [];
    for (const fid of funIds) {
      const fg = this.funtionSourceGraph(fid);
      if (fg === undefined || fg.entryNodes.length === 0) {
        continue;
      }
      if (fg?.allNodes !== undefined) {
        const content = sourceControlFlowGraphToDot(
          fg,
          `function ${fid}`,
          config.includeInstructions,
        );
        const p = pathJoin(outputDir, `sourcefun${fid}.dot`);
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
  nodeId: string;
  node?: AgnosticNode;
  sourceLocation: SourceCodeLocation;
  edges: SourceCFGNode[];
  wasmFunOwner: number;
  instructions: WasmInstruction[];
  instructionsIndexes: number[];
  addressesWithoutASTNode: Set<number>;
}
function sourceCFGNodeToJSONObj(n: SourceCFGNode): object {
  const edges: object[] = n.edges.map((e) => {
    return { nodeID: e.nodeId };
  });

  return {
    nodeId: n.nodeId,
    node: 'TODO AgnosticNode',
    sourceLocation: n.sourceLocation as object,
    wasmFunOwner: n.wasmFunOwner,
    instructions: n.instructions.map((i) => i.toJSONObj()),
    instructionsIndexes: n.instructionsIndexes,
    addressesWithoutASTNode: Array.from(n.addressesWithoutASTNode),
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

export interface FunctionTreeGraph {
  entryNodes: SourceCFGNode[];
  allNodes: SourceCFGNode[];
}

function functionTreeGraphToJSONObj(f: FunctionTreeGraph): object {
  return {
    entryNodes: f.entryNodes.map((en) => en.nodeId),
    allNodes: f.allNodes.map((en) => sourceCFGNodeToJSONObj(en)),
  };
}

function buildSourceCFGraph(
  sourceMap: SourceMap,
  // asts: AgnosticASTMap,
  cfg: WasmControlFlowGraph,
): Map<number, FunctionTreeGraph> {
  logger.debug(
    `Building Source Level Control Flow Graph for #${sourceMap.wasm.functions.length}`,
  );
  const ctg = new Map<number, FunctionTreeGraph>();
  const funcs = sourceMap.wasm.functions;
  for (let idx = 0; idx < funcs.length; idx++) {
    const f = funcs[idx];
    logger.debug(
      `[${idx}/${funcs.length - 1}] Building SCFG for function ${f.id}`,
    );
    const funGraph = buildCTGraphForFunction(f, sourceMap, cfg);
    logger.debug(
      `[${idx}/${funcs.length - 1}] Storing SCFG of function ${f.id} to Map`,
    );
    ctg.set(f.id, funGraph);
  }
  return ctg;
}

function buildCTGraphForFunction(
  f: WASMFunction,
  sourceMap: SourceMap,
  // asts: AgnosticASTMap,
  cfg: WasmControlFlowGraph,
): FunctionTreeGraph {
  // TODO use depthfirst traversal to build the whole graph in one go
  // console.log();
  // console.log(`===================================`);
  // console.log(`===================================`);
  // console.log();
  const graph = cfg.getCFGStrict(f.id);
  const ns = createAllNodes(f.id, sourceMap, graph);
  // console.log(`===================================`);
  logger.debug(
    `${ns.length === 0 ? 'No edges to add' : 'Adding Edges'} for function ${f.id}`,
  );
  // console.log(`===================================`);
  const entryNodes =
    ns.length === 0 ? [] : addEdgesAndReturnEntryNodes(graph, ns);
  logger.debug(`Found #${entryNodes.length} EntryNodes for function ${f.id}`);
  return { entryNodes, allNodes: ns };
}

// function logNode(n: AgnosticNode): string {
//   const sp = n.startPosition;
//   const ep = n.endPosition;
//   return `{startLoc: (${sp.linenr}, ${sp.colnr}), endLoc: (${ep.linenr}, ${ep.colnr}), srcTxt: '${n.node.text}'}`;
// }

function createAllNodes(
  funID: number,
  sourceMap: SourceMap,
  // asts: AgnosticASTMap,
  funGraph: WASMFunGraph,
): SourceCFGNode[] {
  logger.debug(`Creating all nodes for ${funID}`);
  const entryNode = funGraph.entryNode;
  const g = funGraph.graph;
  const nodes: SourceCFGNode[] = [];

  breadthFirstTraverseWasmCFGT(g, entryNode, {
    onNode: (n: CFGNode) => {
      // console.log(
      //   `\nNode ID ${n.nodeID} instructions #${n.instructions.length}`,
      // );
      let prevNode: SourceCFGNode | undefined;
      for (let i = n.instructions.length - 1; i >= 0; i--) {
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
          // console.log(`instruction ${instructionToString(instr)} has no node`);
          if (prevNode !== undefined) {
            // const prevStr = logNode(prevNode.node);
            // console.log(
            //   `instruction ${instructionToString(instr)} added to prevNode with id ${prevNode.nodeId} node txt '${prevStr}'`,
            // );
            prevNode.addressesWithoutASTNode.add(instr.startAddress);
          } else {
            // console.log(
            //   `encountered a wasm instr ${instructionToString(instr)} that cannot be stored on any CTN`,
            // );
          }
          continue;
        }
        const sourceLocation = sourceLocations[0];
        // const nodeStr = logNode(agnosticNode);
        const node = createNodeIfNeeded(
          funID,
          nodes,
          sourceLocation,
          instr,
          n.instructionsIndexes[i],
        );
        if (prevNode !== undefined) {
          // const prevStr = logNode(prevNode.node);
          if (node.nodeId !== prevNode.nodeId) {
            // console.log(
            //   `insrtuction ${instructionToString(instr)} new CTG node id ${node.nodeId} '${prevStr}'`,
            // );
            addEdge(node, prevNode);
          } else {
            // console.log(
            //   `insrtuction ${instructionToString(instr)} on prev CTG node id ${node.nodeId} txt '${prevStr}'`,
            // );
          }
        } else {
          // console.log(
          //   `insrtuction ${instructionToString(instr)} new CTG node id ${node.nodeId} (prev is undefined) txt ${nodeStr}'`,
          // );
        }
        prevNode = node;
      }
    },
  });

  return nodes;
}

function searchCTGNInDecreasingAddresses(
  n: CFGNode,
  nodes: SourceCFGNode[],
): SourceCFGNode | undefined {
  const increment = false;
  return searchSourceCFGNode(n, nodes, increment);
}

function searchSourceCFGNIncreasingAddresses(
  n: CFGNode,
  nodes: SourceCFGNode[],
): SourceCFGNode | undefined {
  const increment = true;
  return searchSourceCFGNode(n, nodes, increment);
}

function searchSourceCFGNode(
  n: CFGNode,
  nodes: SourceCFGNode[],
  fromLowAddressToHigh: boolean,
): SourceCFGNode | undefined {
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
    const ns = nodes.filter((n) => {
      return (
        n.instructions.find((ni) => ni.startAddress === instr.startAddress) !==
        undefined
      );
    });

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

function addEdgesAndReturnEntryNodes(
  funGraph: WASMFunGraph,
  nodes: SourceCFGNode[],
): SourceCFGNode[] {
  const entryNode = funGraph.entryNode;
  const g = funGraph.graph;
  const entryCTGNodes: SourceCFGNode[] = [];
  const entryNodesAdded = new Set<string>();
  const nodesToIgnore: Set<number> = new Set<number>();
  breadthFirstTraverseWasmCFGT(g, entryNode, {
    onNode: (n: CFGNode) => {
      // console.log(`\nNode ID ${n.nodeID}`);
      const ctgn = searchCTGNInDecreasingAddresses(n, nodes);
      if (ctgn === undefined) {
        if (n.nodeID === entryNode.nodeID) {
          // handle special case where entry has no associated CTG node
          const [newNodesToIngore, entryNodes] = searchNeighboursWithASTs(
            g,
            entryNode,
            nodes,
          );
          newNodesToIngore.forEach((ni) => nodesToIgnore.add(ni));
          entryNodes.forEach((en) => {
            if (!entryNodesAdded.has(en.nodeId)) {
              // console.log(`Added new EntryNode ${logNode(en.node)}`);
              entryCTGNodes.push(en);
              entryNodesAdded.add(en.nodeId);
            }
          });
        }
        if (nodesToIgnore.has(n.nodeID)) {
          // if node n has no CTG node associated then the previous parent node
          // has already added an edge to a (in)direct neighbour of n in a previous loop
          return;
        } else {
          throw new Error(`Case should not have happened`);
        }
      } else {
        // ctgn is not undefined
        // entry CFG node has a corresponding CTG node
        if (n.nodeID === entryNode.nodeID) {
          const startNode = searchSourceCFGNIncreasingAddresses(n, nodes);
          if (startNode === undefined) {
            throw new Error(`startNode should not be undefined`);
          }
          if (!entryNodesAdded.has(startNode.nodeId)) {
            // console.log(`Added new EntryNode ${logNode(ctgn.node)}`);
            entryCTGNodes.push(startNode);
            entryNodesAdded.add(startNode.nodeId);
          }
        }
      }

      // case where we check if maybe we have to add edges which can happen when:
      // 1. the fromInstruction of the wasm cfg node and the toInstruct belong to
      // two different source CFG nodes
      // 2. in the case that the fromInstr and toInstr belong to the same source CFG node cfgn
      // then adding an edge may not be needed:
      // 2.a. if there is just one edge then toInstr of the wasm CFG node is a
      // block instr (e.g., block or loop) and no edge is needed to be added
      // 2.b if the toInstr is a call or indirect call an edge needs to be added to another node
      // 2.c. if the toInstr is a branching instruction (e.g., br, br_if, br_table) and edge may
      // need to be added. And this depending on where the toInstr points to. However,
      // this case 2.c can be handled on the next node visit which in that case should be the
      // the first condition to check
      // console.log(`Adding edges for node ${logNode(ctgn.node)}`);

      for (const e of n.edges) {
        // console.log(
        //   `instrFrom ${instructionToString(e.instrFrom)} -> instrTo ${instructionToString(e.instrTo)}`,
        // );
        const toNode = getWasmCFGNode(g, e.instrTo.startAddress);
        const toctgn = searchSourceCFGNIncreasingAddresses(toNode, nodes);
        if (toctgn !== undefined) {
          // console.log(
          //   `about to add edge from ${logNode(ctgn.node)} to ${logNode(toctgn.node)}`,
          // );
          if (ctgn.nodeId !== toctgn.nodeId) {
            // case 1
            addEdge(ctgn, toctgn);
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
              const destNode = getWasmCFGNode(g, be.instrTo.startAddress);
              const destcfgn = searchSourceCFGNIncreasingAddresses(
                destNode,
                nodes,
              );
              if (destcfgn === undefined) {
                throw new Error(`TODO search deeper in patch`);
              } else {
                // if (destcfgn.nodeId === ctgn.nodeId) {
                addEdge(ctgn, toctgn);
                // }
              }
            }
          } else {
            continue;
          }
        } else {
          // we have to search for all the neighbours of toNode that have a CTG node
          const [newNodesToIngore, indirectNodes] = searchNeighboursWithASTs(
            g,
            toNode,
            nodes,
          );
          newNodesToIngore.forEach((nid) => nodesToIgnore.add(nid));
          for (const indirectCTGN of indirectNodes) {
            addEdge(ctgn, indirectCTGN);
          }
        }
      }
    },
  });
  // }

  return entryCTGNodes;
}

function searchNeighboursWithASTs(
  g: WasmGraph,
  n: CFGNode,
  nodes: SourceCFGNode[],
): [Set<number>, SourceCFGNode[]] {
  logger.debug(`${n.nodeID}`);
  const nodesToIgnore = new Set<number>();
  nodesToIgnore.add(n.nodeID);
  const found: SourceCFGNode[] = [];
  for (const e of n.edges) {
    const toNode = getWasmCFGNode(g, e.instrTo.startAddress);
    const toctgn = searchSourceCFGNIncreasingAddresses(toNode, nodes);
    if (toctgn === undefined) {
      const [newNodesToIngore, ns] = searchNeighboursWithASTs(g, toNode, nodes);
      newNodesToIngore.forEach((nodeid) => nodesToIgnore.add(nodeid));
      ns.forEach((nf) => found.push(nf));
    } else {
      found.push(toctgn);
    }
  }
  return [nodesToIgnore, found];
}

function createNodeIfNeeded(
  funID: number,
  nodes: SourceCFGNode[],
  sourceLocation: SourceCodeLocation,
  instrToAdd: WasmInstruction,
  instrIndex: number,
): SourceCFGNode {
  const id = generateNodeID(sourceLocation);
  let ncfg = findNode(nodes, id);
  if (ncfg === undefined) {
    ncfg = {
      wasmFunOwner: funID,
      nodeId: id,
      sourceLocation,
      edges: [],
      instructions: [],
      addressesWithoutASTNode: new Set(),
      instructionsIndexes: [],
    };
    nodes.push(ncfg);
  }
  ncfg.instructions.push(instrToAdd);
  ncfg.instructionsIndexes.push(instrIndex);
  if (ncfg.instructions.length > 1) {
    ncfg.instructions.sort((i1, i2) => i1.startAddress - i2.startAddress);
    ncfg.instructionsIndexes.sort((i1, i2) => i1 - i2);
  }
  return ncfg;
}

function findNode(
  nodes: SourceCFGNode[],
  id: string,
): SourceCFGNode | undefined {
  return nodes.find((n) => {
    return n.nodeId === id;
  });
}

function addEdge(an1: SourceCFGNode, an2: SourceCFGNode): void {
  const alreadyAdded = an1.edges.find((n) => {
    return n.nodeId === an2.nodeId;
  });
  if (alreadyAdded === undefined) {
    // const s1 = logNode(an1.node);
    // const s2 = logNode(an2.node);
    if (an1.nodeId === an2.nodeId) {
      // console.log(`addEdge ${an1.nodeId} ${s1} -> ${an2.nodeId} ${s2} LOOP!`);
    } else {
      // console.log(`addEdge ${an1.nodeId} ${s1} -> ${an2.nodeId} ${s2}`);
    }
    an1.edges.push(an2);
  } else {
    // console.log(
    //   `addEdge ${an1.nodeId} -> ${an2.nodeId} cancelled as edge already present`,
    // );
  }
}

function generateNodeID(sourceLocation: SourceCodeLocation): string {
  const idStr = `${sourceLocation.source}\t${sourceLocation.name}\t${sourceLocation.linenr}\t${sourceLocation.colnr}`;
  const hasher = crypto.createHash('md5');
  return hasher.update(idStr).digest('hex');
}
