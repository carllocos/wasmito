import { breadthFirstTraverseWasmCFGT } from './traversals_cfg';
import {
  type WasmGraph,
  type CFGNode,
  type WasmControlFlowGraph,
  getWasmCFGNode,
} from './wasm_cfg';
// import { createLogger } from '../logger/logger';
import { type SourceMap } from '../source_mappers/source_map';
import {
  isCallIndirect,
  isCallInstruction,
  type WASMFunction,
} from '../webassembly';
import {
  instructionToString,
  type WasmInstruction,
} from '../webassembly/wasm/wasm_instruction';
import {
  type AgnosticASTMap,
  AgnosticNodeFromWasmAddress,
  type AgnosticNode,
} from '../language_adaptors/agnostic_node';

// const logger = createLogger('ASTControlFlowGraph');

export class SourceControlFlowGraph {
  private readonly _astGraphs: Map<number, FunctionTreeGraph>;
  private readonly _allGraphNodes: SourceCFGNode[];

  constructor(
    asts: AgnosticASTMap,
    sourceMap: SourceMap,
    cfg: WasmControlFlowGraph,
  ) {
    this._astGraphs = buildControlTreeGraph(sourceMap, asts, cfg);
    let allnodes: SourceCFGNode[] = [];
    for (const funGraph of this._astGraphs.values()) {
      allnodes = allnodes.concat(funGraph.allNodes);
    }
    this._allGraphNodes = allnodes;
  }

  nodesFromAddress(addr: number): SourceCFGNode[] {
    return this._allGraphNodes.filter(
      (n) => n.instructions.find((i) => i.startAddress === addr) !== undefined,
    );
  }
}

interface SourceCFGNode {
  nodeId: number;
  node: AgnosticNode;
  edges: SourceCFGNode[];
  instructions: WasmInstruction[];
  addressesWithoutASTNode: Set<number>;
  hasEdgesToOutSideCalls: WasmInstruction[];
}

interface FunctionTreeGraph {
  entyNodes: SourceCFGNode[];
  allNodes: SourceCFGNode[];
}

function buildControlTreeGraph(
  sourceMap: SourceMap,
  asts: AgnosticASTMap,
  cfg: WasmControlFlowGraph,
): Map<number, FunctionTreeGraph> {
  const ctg = new Map<number, FunctionTreeGraph>();
  for (const f of sourceMap.wasm.functions) {
    const funGraph = buildCTGraphForFunction(f, sourceMap, asts, cfg);
    ctg.set(f.id, funGraph);
  }
  return ctg;
}

function buildCTGraphForFunction(
  f: WASMFunction,
  sourceMap: SourceMap,
  asts: AgnosticASTMap,
  cfg: WasmControlFlowGraph,
): FunctionTreeGraph {
  // TODO use depthfirst traversal to build the whole graph in one go
  console.log();
  console.log(`===================================`);
  console.log(`Building Graph for function ${f.id}`);
  console.log(`===================================`);
  console.log();
  const graph = cfg.getCFGStrict(f.id);
  const ns = createAllNodes(sourceMap, asts, graph);
  console.log(`===================================`);
  console.log(`Adding Edges for function ${f.id}`);
  console.log(`===================================`);
  return { entyNodes: addEdgesAndReturnEntryNodes(graph, ns), allNodes: ns };
}

function createAllNodes(
  sourceMap: SourceMap,
  asts: AgnosticASTMap,
  [entryNode, g]: [CFGNode, WasmGraph],
): SourceCFGNode[] {
  const nodes: SourceCFGNode[] = [];

  breadthFirstTraverseWasmCFGT(g, entryNode, {
    onNode: (n: CFGNode) => {
      console.log(`Node ID ${n.nodeID} instructions #${n.instructions.length}`);
      let prevNode: SourceCFGNode | undefined;
      for (let i = n.instructions.length - 1; i >= 0; i--) {
        const instr = n.instructions[i];
        const agnosticNode = AgnosticNodeFromWasmAddress(
          sourceMap,
          asts,
          instr.startAddress,
        );
        if (agnosticNode === undefined) {
          console.log(`instr ${instructionToString(instr)} has no node`);
          if (prevNode !== undefined) {
            console.log(
              `instr ${instructionToString(instr)} added to prevNode with id ${prevNode.nodeId} node txt '${prevNode.node.node.text}'`,
            );
            prevNode.addressesWithoutASTNode.add(instr.startAddress);
          } else {
            console.log(
              `encountered a wasm instr ${instructionToString(instr)} that cannot be stored on any CTN`,
            );
          }
          continue;
        }
        const node = createNodeIfNeeded(nodes, agnosticNode, instr);
        if (prevNode !== undefined) {
          if (node.nodeId !== prevNode.nodeId) {
            console.log(
              `insrtuction ${instructionToString(instr)} new CTG node id ${node.nodeId} txt '${prevNode.node.node.text}'`,
            );
            addEdge(node, prevNode);
          } else {
            console.log(
              `insrtuction ${instructionToString(instr)} on prev CTG node id ${node.nodeId} txt '${prevNode.node.node.text}'`,
            );
          }
        } else {
          console.log(
            `insrtuction ${instructionToString(instr)} new CTG node id ${node.nodeId} (prev is undefined) txt ${node.node.node.text}'`,
          );
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
  return searchCTGNFromNode(n, nodes, increment);
}

function searchCTGNInIncreasingAddresses(
  n: CFGNode,
  nodes: SourceCFGNode[],
): SourceCFGNode | undefined {
  const increment = true;
  return searchCTGNFromNode(n, nodes, increment);
}

function searchCTGNFromNode(
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
  [entryNode, g]: [CFGNode, WasmGraph],
  nodes: SourceCFGNode[],
): SourceCFGNode[] {
  const entryCTGNodes: SourceCFGNode[] = [];
  const nodesToIgnore: Set<number> = new Set<number>();
  breadthFirstTraverseWasmCFGT(g, entryNode, {
    onNode: (n: CFGNode) => {
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
          entryNodes.forEach((en) => entryCTGNodes.push(en));
        }
        if (nodesToIgnore.has(n.nodeID)) {
          // if node n has no CTG node associated then the previous parent node
          // has already added an edge to a (in)direct neighbour of n in a previous loop
          return;
        } else {
          throw new Error(`Case should not have happened`);
        }
      } else {
        // entry CFG node has a corresponding CTG node
        entryCTGNodes.push(ctgn);
      }

      for (const e of n.edges) {
        const toNode = getWasmCFGNode(g, e.instrTo.startAddress);
        const toctgn = searchCTGNInIncreasingAddresses(toNode, nodes);
        if (toctgn !== undefined) {
          if (ctgn.nodeId !== toctgn.nodeId) {
            addEdge(ctgn, toctgn);
          } else {
            // this is the case where the to instruction got added to the ctgn node
            // from where the edge departs.
            // adding an edge thus results in a loop to the node itself.
            // adding the loop edge is only necessary if
            // if the instruction is a branching instruction
            // if the instruction is a call, call_indirect no need to add a self loop edge
            if (isCallInstruction(e.instrTo) || isCallIndirect(e.instrTo)) {
              console.log(
                `mark node ${ctgn.nodeId} as a node with an edge to an outside call`,
              );
              ctgn.hasEdgesToOutSideCalls.push(e.instrTo);
              continue;
            }
            addEdge(ctgn, toctgn);
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
  const nodesToIgnore = new Set<number>();
  nodesToIgnore.add(n.nodeID);
  const found: SourceCFGNode[] = [];
  for (const e of n.edges) {
    const toNode = getWasmCFGNode(g, e.instrTo.startAddress);
    const toctgn = searchCTGNInIncreasingAddresses(toNode, nodes);
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
  nodes: SourceCFGNode[],
  agnosticNode: AgnosticNode,
  instrToAdd: WasmInstruction,
): SourceCFGNode {
  let ncfg = findNode(nodes, agnosticNode.node.id);
  if (ncfg === undefined) {
    ncfg = {
      nodeId: agnosticNode.node.id,
      node: agnosticNode,
      edges: [],
      instructions: [],
      addressesWithoutASTNode: new Set(),
      hasEdgesToOutSideCalls: [],
    };
    nodes.push(ncfg);
  }
  ncfg.instructions.push(instrToAdd);
  if (ncfg.instructions.length > 1) {
    ncfg.instructions.sort((i1, i2) => i1.startAddress - i2.startAddress);
  }
  return ncfg;
}

function findNode(
  nodes: SourceCFGNode[],
  id: number,
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
    if (an1.nodeId === an2.nodeId) {
      console.log(`addEdge ${an1.nodeId} -> ${an2.nodeId} LOOP!`);
    } else {
      console.log(`addEdge ${an1.nodeId} -> ${an2.nodeId}`);
    }
    an1.edges.push(an2);
  } else {
    console.log(
      `addEdge ${an1.nodeId} -> ${an2.nodeId} cancelled as edge already present`,
    );
  }
}
