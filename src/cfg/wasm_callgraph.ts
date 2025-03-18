/**
 * Implements a Callgraph interface
 */
import fs from 'fs';
import { type WasmModule } from '../webassembly';
import { type WasmCFG } from './wasm_cfg';

export interface CallGraphNode {
  fid: number;
  edges: CallGraphNode[];
}

export class WasmCallGraph {
  public readonly entryNodes: CallGraphNode[];
  public readonly nodes: Map<number, CallGraphNode>;

  constructor(entryNodes: CallGraphNode[], nodes: Map<number, CallGraphNode>) {
    this.entryNodes = entryNodes;
    this.nodes = nodes;
  }

  toDot(outputFile?: string): string {
    const dotstr = serializeToDot(this.entryNodes);
    if (outputFile !== undefined) {
      fs.writeFileSync(outputFile, dotstr);
    }
    return dotstr;
  }
}

export function buildMainWasmCallGraph(
  wasm: WasmModule,
  cfgs: Map<number, WasmCFG>,
): WasmCallGraph {
  // find entry funcs
  const entryFuncs = wasm.getMainFunctions().map((f) => f.id);

  // if no entry funcs found
  // consider all exported funcs
  // as possible entry funcs
  if (entryFuncs.length === 0) {
    const fidMin = wasm.importFuncs.length;
    wasm.functions
      .filter((f) => f.exported && f.id >= fidMin)
      .map((f) => f.id)
      .forEach((f) => entryFuncs.push(f));
  }

  // imported host funcs could call
  // (1) any explicitly exported func in module marked with `export`
  // (2) any func added to a table imported by the host environment
  // (3) any func added to a table exported by the module
  const allExportedFuncs = wasm.functions
    .filter((f) => f.exported)
    .map((f) => f.id);
  for (const ti of wasm.tableImports) {
    for (const el of wasm.elements) {
      if (el.tableId === ti.id) {
        el.funcs.forEach((f) => allExportedFuncs.push(f));
      }
    }
  }
  for (const te of wasm.tableExports) {
    for (const el of wasm.elements) {
      if (el.tableId === te.id) {
        el.funcs.forEach((f) => allExportedFuncs.push(f));
      }
    }
  }
  return buildCallGraph(wasm, entryFuncs, cfgs, allExportedFuncs);
}

export function buildCallGraph(
  wasm: WasmModule,
  entryFuncs: number[],
  cfgs: Map<number, WasmCFG>,
  linkToFuncsWhenNoCFG: number[],
): WasmCallGraph {
  // importedFuncs used for sanity check
  const importedFuncs = new Set(wasm.importFuncs.map((f) => f.id));

  const nodes = new Map<number, CallGraphNode>();
  const funToVisit = entryFuncs.slice(); // copy
  const visited = new Set<number>();

  let f: number | undefined;
  while ((f = funToVisit.shift()) !== undefined) {
    if (visited.has(f)) continue;
    visited.add(f);

    const fg = cfgs.get(f);
    let calls: number[] = [];
    if (fg === undefined) {
      // f is an import
      if (!importedFuncs.has(f)) {
        throw new Error(
          `Function ${f} that has no CFG is expected to be an imported func`,
        );
      }
      calls = linkToFuncsWhenNoCFG;
    } else {
      calls = fg.calls
        .map((c) => c.funIdx)
        .concat(fg.callIndirects.flatMap((ci) => ci.targetFuncs));
    }

    for (const call of calls) {
      addEdge(nodes, f, call);
      if (!visited.has(call)) {
        funToVisit.push(call);
      }
    }
  }

  const entryNodes: CallGraphNode[] = [];
  for (const f of entryFuncs) {
    entryNodes.push(getNodeOrCreate(nodes, f));
  }
  return new WasmCallGraph(entryNodes, nodes);
}

function addEdge(
  nodes: Map<number, CallGraphNode>,
  from: number,
  to: number,
): void {
  const n1 = getNodeOrCreate(nodes, from);
  if (n1.edges.find((edge) => edge.fid === to) === undefined) {
    const n2 = getNodeOrCreate(nodes, to);
    n1.edges.push(n2);
  }
}

function getNodeOrCreate(
  nodes: Map<number, CallGraphNode>,
  fid: number,
): CallGraphNode {
  let n = nodes.get(fid);
  if (n === undefined) {
    n = {
      fid,
      edges: [],
    };
    nodes.set(fid, n);
  }
  return n;
}

function serializeToDot(entryNodes: CallGraphNode[]): string {
  const nodesToVisit = entryNodes.slice();
  const visited = new Set<number>();
  const nodesStr: string[] = [];
  const edgesStr: string[] = [];

  while (nodesToVisit.length > 0) {
    const node = nodesToVisit.shift();
    if (node === undefined) {
      throw new Error(`node is expected to be not undefined`);
    }
    if (visited.has(node.fid)) {
      continue;
    }
    const nodeId = `node${node.fid}`;
    nodesStr.push(`${nodeId} [shape=record, label="{${node.fid}}"];`);

    for (const edge of node.edges) {
      if (!visited.has(edge.fid)) {
        nodesToVisit.push(edge);
      }

      const edgeId = `node${edge.fid}`;
      edgesStr.push(`${nodeId} -> ${edgeId};`);
    }

    visited.add(node.fid);
  }

  const header = `digraph "Call graph" `;
  const ns = nodesStr.join('\n');
  const es = edgesStr.join('\n');
  return `${header}{\n${ns}\n${es}\n}`;
}
