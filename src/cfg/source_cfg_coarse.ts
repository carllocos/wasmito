import {
  equalSourceCodeLocations,
  type SourceCodeLocation,
} from '../source_mappers/source_map';
import {
  isCallIndirect,
  isCallInstruction,
  type CallIndirect,
  type CallInstruction,
  type WasmInstruction,
} from '../webassembly/wasm/wasm_instruction';
import { pathJoin, sanitizeFilename } from '../util/file_util';
import { coarseSourceControlFlowGraphToDot } from './dot_serialize';
import { writeFileSync } from 'fs';
import {
  sourceCFGHasOutgoingFunCallEdges,
  type SourceCFGNode,
  type SourceControlFlowGraph,
} from './source_cfg';

export interface DotSerializationConfgig {
  includeInstructions: boolean;
  includeEmptySCFG: boolean;
  funIds?: number[];
}

export interface CoarseSourceCFGNode {
  nodeId: number;
  originalIDs: Set<number>;
  sourceLocations: SourceCodeLocation[];
  edges: CoarseSourceCFGNode[];
  instructions: WasmInstruction[];
}

export interface CoarseFunctionGraph {
  entryNodes: CoarseSourceCFGNode[];
  allNodes: CoarseSourceCFGNode[];
  exitNodes: CoarseSourceCFGNode[];
}

export class CoarseGrainedSourceCFGraph {
  private readonly _scfg: SourceControlFlowGraph;

  private readonly _funCFGs: Map<number, CoarseFunctionGraph>;

  constructor(sourceCFG: SourceControlFlowGraph) {
    this._scfg = sourceCFG;
    this._funCFGs = this.convertToCoarseGrainedCFGs(sourceCFG);
  }

  getCoarseCFG(fId: number): CoarseFunctionGraph | undefined {
    return this._funCFGs.get(fId);
  }

  serializeToDot(outputDir: string): string[] {
    const dots: string[] = [];
    const seenDotFileNames = new Set<string>();
    for (const fid of this._funCFGs.keys()) {
      const fg = this._funCFGs.get(fid);
      if (fg === undefined || fg.entryNodes.length === 0) {
        continue;
      }
      if (fg?.allNodes !== undefined) {
        const fun = this._scfg.sourceMap.wasm.getFunction(fid);
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
        const content = coarseSourceControlFlowGraphToDot(fg, funName);
        const p = pathJoin(outputDir, `${funName}.coarse.dot`);
        writeFileSync(p, content);
        dots.push(content);
      }
    }
    return dots;
  }

  private convertToCoarseGrainedCFGs(
    scfgs: SourceControlFlowGraph,
  ): Map<number, CoarseFunctionGraph> {
    const m = new Map<number, CoarseFunctionGraph>();
    const funcs = scfgs.sourceMap.wasm.functions.map((f) => f.id);
    for (const fid of funcs) {
      const funCFG = scfgs.getFuntionSourceCFG(fid);
      if (funCFG === undefined) {
        continue;
      }
      const cfg = this.createCoarseCFG(funCFG.entryNodes, funCFG.allNodes);
      if (cfg === undefined) {
        continue;
      }
      m.set(fid, cfg);
    }

    return m;
  }

  private countIncomingEdges(nodes: SourceCFGNode[]): Map<number, number> {
    const incomingEdges = new Map<number, number>();
    for (const n of nodes) {
      for (const [e] of n.edges) {
        const incomingNr = incomingEdges.get(e.nodeId) ?? 0;
        incomingEdges.set(e.nodeId, incomingNr + 1);
      }
    }

    return incomingEdges;
  }

  private createCoarseCFG(
    entryNodes: SourceCFGNode[],
    allSourceNodes: SourceCFGNode[],
  ): CoarseFunctionGraph | undefined {
    if (entryNodes.length === 0) {
      return undefined;
    }

    const coarseNodes = new Map<number, CoarseSourceCFGNode>();
    const visitedNodes = new Set<number>();
    const nodesToVisit: SourceCFGNode[] = [];
    const exitNodesIDs = new Set<number>();
    const incomingEdges = this.countIncomingEdges(allSourceNodes);

    const coarseEntryNodes: CoarseSourceCFGNode[] = [];
    for (const entryNode of entryNodes) {
      visitedNodes.add(entryNode.nodeId);

      const cn = createOrGetCoarseNode(coarseNodes, entryNode);
      coarseEntryNodes.push(cn);
      if (entryNodes.length > 1) {
        for (const [e] of entryNode.edges) {
          cn.edges.push(createOrGetCoarseNode(coarseNodes, e));
          coarseNodeAddEdge(coarseNodes, entryNode, e);
          nodesToVisit.push(e);
        }
      } else if (entryNode.edges.length === 1) {
        // case where we can merge the entry node and its neighbour
        // as long as:
        // 1. no more than one incoming edge for the node
        // 2. the neighbour is not a call node
        // 3. the entryNode is not a call
        const [neighbour] = entryNode.edges[0];
        const nrIncomingEdges = incomingEdges.get(neighbour.nodeId);
        if (nrIncomingEdges === undefined) {
          throw new Error(
            `Number of incomingEdges for node ${neighbour.nodeId} should not be undefined`,
          );
        }
        if (
          nrIncomingEdges === 1 &&
          !sourceCFGHasOutgoingFunCallEdges(entryNode) &&
          !sourceCFGHasOutgoingFunCallEdges(neighbour)
        ) {
          mergeSourceNodes(coarseNodes, entryNode, neighbour);
        } else {
          coarseNodeAddEdge(coarseNodes, entryNode, neighbour);
        }
        nodesToVisit.push(neighbour);
      }
    }

    while (nodesToVisit.length > 0) {
      const nodeToVist = nodesToVisit.shift();
      if (nodeToVist === undefined) {
        // should not happen
        throw new Error(`Node should not be undefined as length was above 0`);
      }
      if (visitedNodes.has(nodeToVist.nodeId)) {
        continue;
      }

      visitedNodes.add(nodeToVist.nodeId);

      // we can only merge nodeToVisit with its neighbour as long:
      // (1) nodeToVisit has only one neighbour,
      // (2) neighbour has only one incoming edge
      // (3) nodeToVisit is not a func call
      // (4) neighbour is not a func call
      if (nodeToVist.edges.length === 0) {
        // no neighbours so nothing to merge
        createOrGetCoarseNode(coarseNodes, nodeToVist);
        exitNodesIDs.add(nodeToVist.nodeId);
      } else if (nodeToVist.edges.length === 1) {
        const [neighbour] = nodeToVist.edges[0];
        const nrIncomingEdges = incomingEdges.get(neighbour.nodeId);
        if (nrIncomingEdges === undefined) {
          throw new Error(
            `Number of incomingEdges for node ${neighbour.nodeId} should not be undefined`,
          );
        }
        if (
          nrIncomingEdges > 1 ||
          sourceCFGHasOutgoingFunCallEdges(nodeToVist) ||
          sourceCFGHasOutgoingFunCallEdges(neighbour)
        ) {
          // cannot merge as one of the nodes is a fun call
          // or incoming edges of neighbour is not 1
          createOrGetCoarseNode(coarseNodes, nodeToVist);
          coarseNodeAddEdge(coarseNodes, nodeToVist, neighbour);
        } else {
          mergeSourceNodes(coarseNodes, nodeToVist, neighbour);
        }

        nodesToVisit.push(neighbour);
      } else {
        // case where more than one neighbour so nothing to merge
        for (const [e] of nodeToVist.edges) {
          coarseNodeAddEdge(coarseNodes, nodeToVist, e);
          if (!visitedNodes.has(e.nodeId)) {
            nodesToVisit.push(e);
          }
        }
      }
    }

    const allNodes: CoarseSourceCFGNode[] = [];
    const coarseNodeSeen = new Set<number>();
    for (const n of coarseNodes.values()) {
      if (!coarseNodeSeen.has(n.nodeId)) {
        allNodes.push(n);
        coarseNodeSeen.add(n.nodeId);
      }
    }
    const exitNodes: CoarseSourceCFGNode[] = [];
    for (const exitID of exitNodesIDs.values()) {
      const exitNode = coarseNodes.get(exitID);
      if (exitNode === undefined) {
        throw new Error(
          `ExitNode with ID=${exitID} has no Associated CoarseGrained Node`,
        );
      }
      exitNodes.push(exitNode);
    }
    return {
      entryNodes: coarseEntryNodes,
      allNodes,
      exitNodes,
    };
  }
}

function createOrGetCoarseNode(
  nodes: Map<number, CoarseSourceCFGNode>,
  n: SourceCFGNode,
): CoarseSourceCFGNode {
  let cn = nodes.get(n.nodeId);
  if (cn !== undefined) {
    return cn;
  }
  cn = {
    nodeId: n.nodeId,
    originalIDs: new Set([n.nodeId]),
    sourceLocations: [n.sourceLocation],
    edges: [],
    instructions: n.instructions,
  };

  nodes.set(n.nodeId, cn);
  return cn;
}

function mergeSourceNodes(
  nodes: Map<number, CoarseSourceCFGNode>,
  s1: SourceCFGNode,
  s2: SourceCFGNode,
): CoarseSourceCFGNode {
  const cn1 = createOrGetCoarseNode(nodes, s1);
  const cn2 = createOrGetCoarseNode(nodes, s2);
  if (cn1.nodeId === cn2.nodeId) {
    // already merged
    return cn1;
  }

  for (const id of cn2.originalIDs) {
    cn1.originalIDs.add(id);
  }
  for (const sl of cn2.sourceLocations) {
    const found = cn1.sourceLocations.find((otherloc) => {
      return equalSourceCodeLocations(otherloc, sl);
    });
    if (found === undefined) {
      cn1.sourceLocations.push(sl);
    }
  }

  for (const ed of cn2.edges) {
    const found = cn1.edges.find((otherEdge) => {
      return otherEdge.nodeId === ed.nodeId;
    });
    if (found === undefined) {
      cn1.edges.push(ed);
    }
  }
  cn2.instructions.forEach((i) => cn1.instructions.push(i));
  nodes.set(s2.nodeId, cn1);
  return cn1;
}

function coarseNodeAddEdge(
  nodes: Map<number, CoarseSourceCFGNode>,
  from: SourceCFGNode,
  to: SourceCFGNode,
): void {
  const n1 = createOrGetCoarseNode(nodes, from);
  const n2 = createOrGetCoarseNode(nodes, to);
  const found = n1.edges.find((edge) => {
    return edge.nodeId === n2.nodeId;
  });
  if (found === undefined) {
    n1.edges.push(n2);
  }
}

export function getCallInstructionsCoarseSourceNode(
  n: CoarseSourceCFGNode,
): Array<CallInstruction | CallIndirect> {
  const calls: Array<CallInstruction | CallIndirect> = [];
  for (const i of n.instructions) {
    if (isCallInstruction(i) || isCallIndirect(i)) {
      calls.push(i);
    }
  }

  return calls;
}

export function coarseSourceCFGNodeHasCallInstructions(
  n: CoarseSourceCFGNode,
): boolean {
  // TODO speed up
  return getCallInstructionsCoarseSourceNode(n).length > 0;
}
