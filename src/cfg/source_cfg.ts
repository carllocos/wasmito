import { type WasmCFGs } from './wasm_cfg';
import {
  sourceCodeLocationToString,
  SourceMap,
  type SourceCodeLocation,
} from '../source_mappers/source_map';
import {
  isCallIndirect,
  isCallInstruction,
  instructionToString,
  type WasmInstruction,
  type CallInstruction,
  type CallIndirect,
} from '../webassembly/wasm/wasm_instruction';
import {
  type AgnosticASTMap,
  type AgnosticNode,
} from '../language_adaptors/agnostic_node';
import { getFileName, pathJoin, sanitizeFilename } from '../util/file_util';
import { sourceControlFlowGraphToDot } from './dot_serialize';
import { writeFileSync } from 'fs';
import { createLogger } from '../logger/logger';
import path from 'path';
import { buildSourceCFGraph } from './source_cfg_builder';
import { searchForNextReachableSourceNodes } from './source_cfg_helper';

const logger = createLogger('ASTControlFlowGraph');
export interface DotSerializationConfig {
  includeInstructions: boolean;
  includeEmptySCFG: boolean;
  includeExitNode: boolean;
  includeEntryNode: boolean;
  funIds?: number[];
}

interface DotMetaData {
  funName: string;
  dotPath: string;
  fid: number;
}

export type FunToSourceCFG = Map<number, BinaryLiftedCFG>;

export class SourceCFGs {
  private readonly _funToSourceCFG: FunToSourceCFG;
  private readonly _allGraphNodes: SourceCFGNode[];

  private _sourceMap: SourceMap | undefined;
  public readonly fullSourceMap: SourceMap;
  private readonly _wasmCFGs: WasmCFGs;

  constructor(asts: AgnosticASTMap, sourceMap: SourceMap, wasmCFGs: WasmCFGs) {
    this.fullSourceMap = sourceMap;
    this._wasmCFGs = wasmCFGs;
    this._funToSourceCFG = buildSourceCFGraph(sourceMap, wasmCFGs);
    let allNodes: SourceCFGNode[] = [];
    for (const funGraph of this._funToSourceCFG.values()) {
      allNodes = allNodes.concat(funGraph.allNodes);
    }
    this._allGraphNodes = allNodes;
  }

  get sourceMap(): SourceMap {
    if (this._sourceMap === undefined) {
      this._sourceMap = this.keepLocationsOfNodes(this.fullSourceMap);
    }
    return this._sourceMap;
  }

  private keepLocationsOfNodes(sourcemap: SourceMap): SourceMap {
    const mappings = this.allNodes().map((n) =>
      Object.assign({}, n.sourceLocation),
    );
    const sm = new SourceMap(sourcemap, sourcemap.sources, mappings);
    return sm;
  }

  get wasmCFGs(): WasmCFGs {
    return this._wasmCFGs;
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
      `get generatedPosition for Location {${location.source}, ${location.linenr}, ${location.colnr}}`,
    );

    let mappings: SourceCodeLocation[] = [];
    if (location.address > 0) {
      mappings = this.sourceMap.getOriginalPositionFor(location.address);
      logger.debug(
        `#${mappings.length} mappings found for Location ${sourceCodeLocationToString(location)}`,
      );
    } else {
      mappings = this.sourceMap.generatedPositionFor(location);
      logger.debug(
        `#${mappings.length} mappings found for Location {${location.source}, ${location.linenr}, ${location.colnr}}`,
      );
    }

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
      return nodes.flat();
    } else if (nodes.length === 1) {
      return nodes[0];
    } else {
      return [];
    }
  }

  getFunctionSourceCFG(fid: number): BinaryLiftedCFG | undefined {
    return this._funToSourceCFG.get(fid);
  }

  getFunctionSourceCFGStrict(fid: number): BinaryLiftedCFG {
    const f = this.getFunctionSourceCFG(fid);
    if (f === undefined) {
      throw new Error(`Function ${fid} does not have a source CFG`);
    }
    return f;
  }

  getFunctionEntryNodes(fid: number): SourceCFGNode[] {
    const f = this.getFunctionSourceCFG(fid);
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
    if (isCallNode(n)) {
      const callInstr = getCallInstructions(n);
      for (const i of callInstr) {
        if (isCallInstruction(i)) {
          const graph = this._funToSourceCFG.get(i.funIdx);
          if (graph === undefined) {
            // this can happen if funIDX is an imported env fun
            // or a function for which no source file is available
            continue;
          }
          graph.entryNodes.forEach((n) => {
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
  ): Array<[SourceCFGNode, number]> {
    const alreadyAdded = new Set<number>();
    const ns: Array<[SourceCFGNode, number]> = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [e, _iFrom, ito] of n.edges) {
      if (!alreadyAdded.has(ito.startAddress)) {
        ns.push([e, ito.startAddress]);
        alreadyAdded.add(ito.startAddress);
      }
    }
    if (!ignoreExitNodes && isCallNode(n)) {
      this.getFunctionEntryNodesFromNode(n).forEach((en) => {
        const startAddress = sourceNodeFirstInstrStartAddr(en);
        if (!alreadyAdded.has(startAddress)) {
          ns.push([en, startAddress]);
          alreadyAdded.add(startAddress);
        }
      });
    }
    return ns;
  }

  nodeFromAddr(addr: number): SourceCFGNode | undefined {
    return undefined;
  }

  nextReachableSourceNodesFromAddr(
    addr: number,
  ): Array<[SourceCFGNode, number]> {
    const g = this.wasmCFGs.getCFGFromAddr(addr);
    const startNode = g?.addrToNode.get(addr);
    if (g === undefined || startNode === undefined) {
      return [];
    }

    const [next] = searchForNextReachableSourceNodes(
      this._funToSourceCFG,
      this.wasmCFGs,
      g,
      startNode,
      this.allNodes(),
    );
    return next.map(([n, i]) => [n, i.startAddress]);
  }

  serializeToDot(
    outputDir: string,
    config: DotSerializationConfig,
    prefixFilenameIfDefaultTooLong: string = 'sourceCFG',
  ): string[] {
    const funIds = config.funIds ?? [];
    if (funIds.length === 0) {
      this.sourceMap.wasm.functions.forEach((f) => funIds.push(f.id));
    }

    const seenDotFileNames = new Set<string>();
    const dots: string[] = [];
    const metadata: DotMetaData[] = [];
    for (const fid of funIds) {
      const fg = this.getFunctionSourceCFG(fid);
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
        const content = sourceControlFlowGraphToDot(fg, funName, config);
        const p = pathJoin(outputDir, `${funName}.dot`);
        try {
          writeFileSync(p, content);
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes('ENAMETOOLONG')) {
              const shortPath = pathJoin(
                outputDir,
                `${prefixFilenameIfDefaultTooLong}_fun${fid}.dot`,
              );
              writeFileSync(shortPath, content);
            } else {
              throw err;
            }
          }
        }
        dots.push(content);
        const dotMetadata: DotMetaData = {
          funName,
          dotPath: p,
          fid,
        };
        metadata.push(dotMetadata);
      }
    }

    writeFileSync(
      pathJoin(outputDir, `dots_metadata.json`),
      JSON.stringify({
        metadata,
      }),
    );

    return dots;
  }

  toJSON(outputDir?: string): string {
    const fgs: Array<{
      funID: number;
      graph: object;
    }> = [];
    for (const f of this.sourceMap.wasm.functions) {
      const g = this._funToSourceCFG.get(f.id);
      if (g !== undefined) {
        fgs.push({
          funID: f.id,
          graph: functionTreeGraphToJSONObj(g),
        });
      }
    }

    const content: object = {
      wasmPath: this.sourceMap.wasm.wasmPath,
      graphs: fgs,
    };

    const json = JSON.stringify(content);
    if (outputDir !== undefined) {
      const includeExtension = false;
      const fn = getFileName(this.sourceMap.wasm.wasmPath, includeExtension);
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

export function isCallNode(n: SourceCFGNode): boolean {
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

export interface BinaryLiftedCFG {
  entryNodes: SourceCFGNode[];
  allNodes: SourceCFGNode[];
  exitNodes: SourceCFGNode[];
}

function functionTreeGraphToJSONObj(f: BinaryLiftedCFG): object {
  return {
    entryNodes: f.entryNodes.map((en) => en.nodeId),
    allNodes: f.allNodes.map((en) => sourceCFGNodeToJSONObj(en)),
  };
}
