/**
 * Provides the interfaces and helper functions to work with a Control Flow Graphs
 * generated for a Wasm module
 */
import { writeFileSync } from 'fs';
import {
  type CallInstruction,
  type WasmInstruction,
  instructionToString,
  type CallIndirect,
} from '../webassembly/wasm/wasm_instruction';
import { type WasmModule } from '../webassembly/wasm/wasm_module';
import { wasmControlFlowGraphToDot } from './dot_serialize';
import path from 'path';
import { getFileName } from '../util/file_util';
import { buildGraphs } from './wasm_cfg_builder';
import { type WasmCallGraph } from './wasm_callgraph';

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
  incomingEdges: CFGEdge[];
}

export type WasmAddrToNodeMap = Map<number, CFGNode>;

export interface WasmCFG {
  entryNode: CFGNode;
  addrToNode: WasmAddrToNodeMap;
  calls: CallInstruction[];
  callIndirects: CallIndirect[];
  exitNode: CFGNode;
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

function wasmFuncGraphToJSONObj(cfg: WasmCFG): object {
  const g: Array<{
    wasmAddr: number;
    node: object;
  }> = [];
  for (const [wasmAddr, nd] of cfg.addrToNode.entries()) {
    g.push({
      wasmAddr,
      node: cfgNodeToObj(nd),
    });
  }
  return {
    entryNode: cfgNodeToObj(cfg.entryNode),
    graph: g,
    calls: cfg.calls.map((c) => c.toJSONObj()),
    callIndirects: cfg.callIndirects.map((c) => c.toJSONObj()),
  };
}

export class WasmCFGs {
  private readonly _wasm: WasmModule;
  private readonly _cfgs: Map<number, WasmCFG>;
  private readonly _callSites: Map<number, Set<number>>;
  private readonly _callgraph: WasmCallGraph;

  constructor(wasm: WasmModule) {
    this._wasm = wasm;
    const [cfgs, callsites, callgraph] = buildGraphs(this._wasm);
    this._cfgs = cfgs;
    this._callSites = callsites;
    this._callgraph = callgraph;
  }

  get callgraph(): WasmCallGraph {
    return this._callgraph;
  }

  getCFG(funID: number): WasmCFG | undefined {
    return this._cfgs.get(funID);
  }

  callSites(funID: number): Set<number> {
    return this._callSites.get(funID) ?? new Set();
  }

  getCFGStrict(funID: number): WasmCFG {
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
      const content = wasmControlFlowGraphToDot(funGraph, `function ${fid}`);
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
}

export function controlFlowGraphToString(
  g: WasmAddrToNodeMap,
  entryNode: CFGNode,
): string {
  return controlFlowGraphToStringHelper(g, entryNode, new Set<number>())[0];
}

function controlFlowGraphToStringHelper(
  g: WasmAddrToNodeMap,
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

export function getWasmNodeEdges(g: WasmAddrToNodeMap, n: CFGNode): CFGNode[] {
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

export function getWasmCFGNode(g: WasmAddrToNodeMap, addr: number): CFGNode {
  const n = g.get(addr);
  if (n === undefined) {
    throw new Error(`No  node found for address ${addr}`);
  }
  return n;
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
