import { breadthFirstTraverseWasmCFG } from './traversals_cfg';
import {
  type WasmAddrToNodeMap,
  type CFGNode,
  type WasmCFGs,
  getWasmCFGNode,
  type WasmCFG,
} from './wasm_cfg';
import {
  equalSourceCodeLocations,
  sourceCodeLocationToString,
  type SourceMap,
  type SourceCodeLocation,
} from '../source_mappers/source_map';
import {
  isBranchingInstruction,
  isCallIndirect,
  isCallInstruction,
  isWasmInstructionBlockBased,
  instructionToString,
  type WasmInstruction,
} from '../webassembly/wasm/wasm_instruction';
import { isFilePath } from '../util/file_util';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import assert from 'assert';
import { type SourceCFGNode, type BinaryLiftedCFG } from './source_cfg';
import { createLogger } from '../logger/logger';

const logger = createLogger('BinaryLift');

export function buildSourceCFGraph(
  sourceMap: SourceMap,
  // asts: AgnosticASTMap,
  cfg: WasmCFGs,
): Map<number, BinaryLiftedCFG> {
  logger.debug(
    `Building Source Level Control Flow Graph for #${sourceMap.wasm.functions.length}`,
  );
  const ctg = new Map<number, BinaryLiftedCFG>();
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
  cfg: WasmCFGs,
): BinaryLiftedCFG {
  /**
   * The process of binary lifting a Wasm CFG is divided into the following steps:
   * 1. Binary Lift the nodes of the Wasm CFG.
   * 2. Binary Lift the edges between the nodes of the Wasm CFG.
   * 3. Merge neighbour nodes of the Binary Lifted CFG when possible
   * 4. search for entry nodes and exit nodes
   *
   * The third step is needed since it may happen that some WasmInstructions that map
   * to the same source code location but that are part of different nodes in the WCFG
   * are then lifted to become neighbour nodes.
   * Merging those nodes is required as they point to the same source code location
   * and otherwise leaving them split would introduce unnecessary debug steps that
   * visually seems as the debugger is not advancing.
   *
   */
  const graph = cfg.getCFGStrict(f.id);
  const ns = binaryLiftWasmNodes(f.id, sourceMap, graph);
  logger.debug(
    `${ns.length === 0 ? 'No edges to add' : 'Adding Edges'} for function ${f.id}`,
  );
  binaryLiftWasmEdges(graph, ns);
  const mergedSourceNodes = mergeSameLocNodeNeighbours(ns);

  const entryNodes = findEntryNodes(graph, mergedSourceNodes);
  logger.debug(`Found #${entryNodes.length} EntryNodes for function ${f.id}`);
  const exitNodes = findExitNodes(graph, mergedSourceNodes);
  logger.debug(`Found #${exitNodes.length} ExitNodes for function ${f.id}`);

  return {
    entryNodes,
    allNodes: mergedSourceNodes,
    exitNodes,
  };
}

function findExitNodes(
  wasmCFG: WasmCFG,
  sourceNodes: SourceCFGNode[],
): SourceCFGNode[] {
  const exitWasmNode = wasmCFG.exitNode;
  const found = sourceCFGNodeAndInstrFromDecrInstrAddrs(
    exitWasmNode,
    sourceNodes,
  );

  if (found !== undefined) {
    const [exitSourceNode] = found;
    return [exitSourceNode];
  }

  const [exitSourceNodes] = closestParentsWithSourceNodes(
    wasmCFG.addrToNode,
    exitWasmNode,
    sourceNodes,
  );

  return exitSourceNodes;
}

/**
 * Idem as `closestNeighboursWithSourceNodes` but the search happens in the direction
 * of the parents of node `n`
 * @param g
 * @param n
 * @param sourceNodes
 * @param wasmNodesVisited
 * @returns
 */
function closestParentsWithSourceNodes(
  g: WasmAddrToNodeMap,
  n: CFGNode,
  sourceNodes: SourceCFGNode[],
  wasmNodesVisited: Set<number> = new Set<number>(),
): [SourceCFGNode[], Set<number>] {
  if (wasmNodesVisited.has(n.nodeID)) {
    return [[], wasmNodesVisited];
  }

  wasmNodesVisited.add(n.nodeID);

  const exitSourceNodes: SourceCFGNode[] = [];
  const sourceNodesAdded = new Set<number>();
  for (const incomingEdge of n.incomingEdges) {
    const fromWasmNode = getWasmCFGNode(g, incomingEdge.instrFrom.startAddress);
    const found = sourceCFGNodeAndInstrFromDecrInstrAddrs(
      fromWasmNode,
      sourceNodes,
    );
    if (found === undefined) {
      const [closest, newlyVisited] = closestParentsWithSourceNodes(
        g,
        fromWasmNode,
        sourceNodes,
        wasmNodesVisited,
      );
      closest.forEach((n) => {
        if (!sourceNodesAdded.has(n.nodeId)) {
          exitSourceNodes.push(n);
          sourceNodesAdded.add(n.nodeId);
        }
      });
      newlyVisited.forEach((v) => wasmNodesVisited.add(v));
    } else {
      const [n] = found;
      exitSourceNodes.push(n);
    }
  }
  return [exitSourceNodes, wasmNodesVisited];
}

function findEntryNodes(
  wasmCFG: WasmCFG,
  sourceNodes: SourceCFGNode[],
): SourceCFGNode[] {
  // the entry source node CFG is the first source level CFG node that we find
  // when traversing the entry WasmNode from low WasmInstruction addresses to high
  const foundEntryNode = sourceCFGNodeAndInstrFromIncrInstrAddrs(
    wasmCFG.entryNode,
    sourceNodes,
  );
  if (foundEntryNode !== undefined) {
    const [entrySourceNode] = foundEntryNode;
    return [entrySourceNode];
  }

  // case where Wasm entry node has no associated source CFGNode
  // we have to retrieve the (indirect) children of the entryNode
  // that do have a source CFG node associated to them
  const [entryNodesAndInstr] = closetNeighboursWithSourceNodes(
    wasmCFG.addrToNode,
    wasmCFG.entryNode,
    sourceNodes,
  );
  const entryNodes = entryNodesAndInstr.map((n) => n[0]);
  return entryNodes;
}

function mergeSameLocNodeNeighbours(
  allNodes: SourceCFGNode[],
): SourceCFGNode[] {
  /** TODO doc
   */

  for (const n of allNodes) {
    if (
      n.incomingEdges.length === 0 ||
      n.incomingEdges.some(([inNode]) => {
        return !equalSourceCodeLocations(
          inNode.sourceLocation,
          n.sourceLocation,
        );
      })
    ) {
      continue;
    }

    let mergedNode = n;
    for (let j = 0; j < n.incomingEdges.length; j++) {
      const [inNode] = n.incomingEdges[j];
      if (
        inNode.sourceLocation.address === -1 ||
        mergedNode.nodeId === inNode.nodeId
      ) {
        continue;
      }
      mergedNode = mergeNeighbourNodes(inNode, mergedNode);
    }
  }

  return allNodes.filter((n) => {
    return n.sourceLocation.address !== -1;
  });
}

// function logNode(n: AgnosticNode): string {
//   const sp = n.startPosition;
//   const ep = n.endPosition;
//   return `{startLoc: (${sp.linenr}, ${sp.colnr}), endLoc: (${ep.linenr}, ${ep.colnr}), srcTxt: '${n.node.text}'}`;
// }

function binaryLiftWasmNodes(
  funID: number,
  sourceMap: SourceMap,
  funGraph: WasmCFG,
): SourceCFGNode[] {
  logger.debug(`Creating all nodes for ${funID}`);
  const entryNode = funGraph.entryNode;
  const g = funGraph.addrToNode;
  const nodes: SourceCFGNode[] = [];

  breadthFirstTraverseWasmCFG(g, entryNode, {
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
 * the Source Level node associated to each Wasm instruction belonging to `n`.
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
 * the Source Level node associated to each Wasm instruction belonging to `n`.
 * @param n Wasm CFG node
 * @param nodes source level CFG nodes
 * @returns Source Level CFG and Wasm Instruction
 */
export function sourceCFGNodeAndInstrFromIncrInstrAddrs(
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
 * @param funGraph the CFG of the wasm function
 * @param sourceNodes Source Level CFG nodes that need to be augmented with edges
 */
function binaryLiftWasmEdges(
  funGraph: WasmCFG,
  sourceNodes: SourceCFGNode[],
): void {
  if (sourceNodes.length === 0) {
    return;
  }

  const g = funGraph.addrToNode;
  const wasmNodesToIgnore: Set<number> = new Set<number>();
  breadthFirstTraverseWasmCFG(g, funGraph.entryNode, {
    onNode: (wasmNode: CFGNode) => {
      const found = sourceCFGNodeAndInstrFromDecrInstrAddrs(
        wasmNode,
        sourceNodes,
      );
      if (found === undefined) {
        return;
      }

      // the following code only made sense from the perspective if the
      // SCFG nodes are unique per sourcecode location.
      // This means that all SCFG edges are automatically added

      // case where we check if maybe we have to add edges which can happen when:
      // 1. the fromInstruction of the wasm cfg node and the toInstruct belong to
      // two different source CFG nodes
      // 2. in the case that the fromInstr and toInstr belong to the same source CFG node cfgn
      // then adding an edge may not be needed:
      // 2.a. if there is just one edge then toInstr of the wasm CFG node is a
      // block instr (e.g., block or loop) and no edge is needed to be added
      // AFTER updating the SCFG to no longer be unique with respect to sourcecode locations.
      // This case will be automatically solved by merging neighbours
      // 2.b if the toInstr is a call or indirect call the corresponding Source CFG Node no edge
      // needs to be added. This call node simply indicates that when applying debug operations
      // and when encountering this call node another Source CFG has to be accessed.
      // AFTER updating the SCFG to no longer be unique with respect to sourcecode locations.
      // This case will be automatically solved by merging neighbours
      // 2.c. if the toInstr is a branching instruction (e.g., br, br_if, br_table) and edge may
      // need to be added. And this depending on where the toInstr points to. However,
      // this case 2.c can be handled on the next node visit which in that case should be the
      // the first condition to check

      const [sourceCFGNodeFrom, fromInstr] = found;
      for (const e of wasmNode.edges) {
        const toWasmNode = getWasmCFGNode(g, e.instrTo.startAddress);
        const foundToNodeAndInstr = sourceCFGNodeAndInstrFromIncrInstrAddrs(
          toWasmNode,
          sourceNodes,
        );

        if (foundToNodeAndInstr !== undefined) {
          const [toSourceCFGNode, toInstr] = foundToNodeAndInstr;

          if (sourceCFGNodeFrom.nodeId !== toSourceCFGNode.nodeId) {
            // case 1
            addEdge(sourceCFGNodeFrom, fromInstr, toSourceCFGNode, toInstr);
          } else if (isWasmInstructionBlockBased(e.instrTo)) {
            // case 2.a
            throw new Error('case 2.a from -> to (to is Block-based instr)');
            // continue;
          } else if (
            isCallInstruction(e.instrTo) ||
            isCallIndirect(e.instrTo)
          ) {
            // case 2.b
            // console.log(
            //   `mark node ${ctgn.nodeId} as a node with an edge to an outside call`,
            // );
            // continue;
            throw new Error(
              'case 2.b from -> to (to is call or indirect call)',
            );
          } else if (isBranchingInstruction(e.instrFrom)) {
            // case 2.c
            // TODO generalise to paths
            addEdge(sourceCFGNodeFrom, fromInstr, toSourceCFGNode, toInstr);
            // throw new Error('case 2.c from -> to (to is a branch instr)');
            // const branchingNode = getWasmCFGNode(g, e.instrFrom.startAddress);
            // for (const be of branchingNode.edges) {
            //   const destWasmNode = getWasmCFGNode(g, be.instrTo.startAddress);
            //   const foundDestSourceAndInstr =
            //     sourceCFGNodeAndInstrFromIncrInstrAddrs(
            //       destWasmNode,
            //       sourceNodes,
            //     );
            //   if (foundDestSourceAndInstr === undefined) {
            //     throw new Error(`TODO search deeper in patch`);
            //   } else {
            //     const [destSourceNode, destInstr] = foundDestSourceAndInstr;
            //     addEdge(sourceCFGNFrom, fromInstr, destSourceNode, destInstr);
            //   }
            // }
          } else {
            throw new Error('case 2.d from -> to (to is the else case)');
            // continue;
          }
        } else {
          // we have to search for all the neighbours of toNode that have a CFG node
          const [indirectNodes, newWasmNodesToIgnore] =
            closetNeighboursWithSourceNodes(g, toWasmNode, sourceNodes);
          newWasmNodesToIgnore.forEach((nid) => wasmNodesToIgnore.add(nid));
          for (const [indirectNode, indirectInstr] of indirectNodes) {
            addEdge(sourceCFGNodeFrom, fromInstr, indirectNode, indirectInstr);
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
 * These closest source level CFG nodes for `n` are the source nodes that are direct neighbours of n or
 * indirect neighbours.
 *
 * @param g Wasm Level CFG of a Wasm function
 * @param n a node in the Wasm CFG for which we want to find the closest Source Level CFG Nodes
 * @param nodes All the Source Level CFGNodes
 * @param nodesToIgnore a set of already visited node ids. This prevents to loop infinitely.
 * @returns nodes IDs that no longer need to be visited after return and the closets nodes
 */
export function closetNeighboursWithSourceNodes(
  g: WasmAddrToNodeMap,
  n: CFGNode,
  nodes: SourceCFGNode[],
  nodesToIgnore = new Set<number>(),
): [Array<[SourceCFGNode, WasmInstruction]>, Set<number>] {
  logger.debug(`Node ${n.nodeID} has no Source CFGNode`);
  if (nodesToIgnore.has(n.nodeID)) {
    // consider scenario n1 -> n2 -> n3
    //                            -> n4 -> n2
    // if we assume that node n2 and n4 have no source level CFGNodes
    // then the risk exist that the search for the closest source CFGNodes
    // loops forever due to the backEdge from n4 to n2
    // to prevent this we need to keep track of the already visited nodes
    // that solves the callstack exhaustion issue

    // this can also occur when encountering self loops
    // consider n1 -> n2 -> n3 and n2-> n2
    // n2 has a self edge and no source level CFG
    //
    // when this function is called for n2 because of the self edge
    // then the call is stopped given that the id of n2 is
    // stored in the nodesToIgnore
    return [[], nodesToIgnore];
  }

  nodesToIgnore.add(n.nodeID);
  const closest: Array<[SourceCFGNode, WasmInstruction]> = [];
  for (const e of n.edges) {
    const toWasmNode = getWasmCFGNode(g, e.instrTo.startAddress);
    const found = sourceCFGNodeAndInstrFromIncrInstrAddrs(toWasmNode, nodes);
    if (found === undefined) {
      const [ns, newNodesToIgnore] = closetNeighboursWithSourceNodes(
        g,
        toWasmNode,
        nodes,
        nodesToIgnore,
      );
      newNodesToIgnore.forEach((nodeId) => nodesToIgnore.add(nodeId));
      ns.forEach((nf) => closest.push(nf));
    } else {
      closest.push(found);
    }
  }
  return [closest, nodesToIgnore];
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

function removeEdge(
  nodeFrom: SourceCFGNode,
  fromInstr: WasmInstruction,
  nodeTo: SourceCFGNode,
  toInstr: WasmInstruction,
): void {
  const priorRemoval = nodeFrom.edges.length;
  nodeFrom.edges = nodeFrom.edges.filter(
    ([edgeNode, edgeFromInstr, edgeToInstr]) => {
      return (
        edgeNode.nodeId !== nodeTo.nodeId ||
        edgeFromInstr.startAddress !== fromInstr.startAddress ||
        edgeToInstr.startAddress !== toInstr.startAddress
      );
    },
  );
  assert(priorRemoval === nodeFrom.edges.length + 1);

  const pr = nodeTo.incomingEdges.length;
  nodeTo.incomingEdges = nodeTo.incomingEdges.filter(
    ([incoming, edgeFromInstr, edgeToInstr]) => {
      return (
        incoming.nodeId !== nodeFrom.nodeId ||
        edgeFromInstr.startAddress !== fromInstr.startAddress ||
        edgeToInstr.startAddress !== toInstr.startAddress
      );
    },
  );
  assert(pr === nodeTo.incomingEdges.length + 1);
}

function mergeNeighbourNodes(
  nFrom: SourceCFGNode,
  nTo: SourceCFGNode,
): SourceCFGNode {
  if (!equalSourceCodeLocations(nFrom.sourceLocation, nTo.sourceLocation)) {
    throw new Error(
      `Merging two nodes of different source locations: ${sourceCodeLocationToString(nFrom.sourceLocation)} -> ${sourceCodeLocationToString(nTo.sourceLocation)} `,
    );
  }

  // update incoming edges
  const copyIncoming = nTo.incomingEdges.map((n) => n);
  for (const [inNode, instrFrom, instrTo] of copyIncoming) {
    removeEdge(inNode, instrFrom, nTo, instrTo);
    if (inNode.nodeId !== nFrom.nodeId) {
      if (inNode.nodeId === nTo.nodeId) {
        // self edge
        addEdge(nFrom, instrFrom, nFrom, instrTo);
      } else {
        addEdge(inNode, instrFrom, nFrom, instrTo);
      }
    }
  }

  // update outgoing edges of nto
  for (const [outgoingEdge, instrFrom, instrTo] of nTo.edges) {
    if (outgoingEdge.nodeId === nTo.nodeId) {
      // self edge already handled
      // when handling incoming edges
      continue;
    }
    removeEdge(nTo, instrFrom, outgoingEdge, instrTo);
    addEdge(nFrom, instrFrom, outgoingEdge, instrTo);
  }

  nTo.instructions.forEach((i) => {
    nFrom.instructions.push(i);
  });
  nTo.instructionsIndexes.forEach((i) => {
    nFrom.instructionsIndexes.push(i);
  });
  nFrom.instructions.sort((i1, i2) => i1.startAddress - i2.startAddress);
  nFrom.instructionsIndexes.sort((i1, i2) => i1 - i2);
  nFrom.nodeId = nFrom.instructions[0].startAddress;

  // nullify node
  nTo.nodeId = -1 * nTo.nodeId;
  nTo.incomingEdges = [];
  nTo.edges = [];
  nTo.instructionsIndexes = [];
  nTo.node = undefined;
  nTo.sourceLocation = Object.assign({}, nTo.sourceLocation); // It is very important to copy! Otherwise we affect original source map
  nTo.sourceLocation.address = -1;

  return nFrom;
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
