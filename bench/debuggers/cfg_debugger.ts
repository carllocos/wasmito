import {
  sourceCodeLocationToString,
  type SourceCodeLocation,
  type SourceMap,
} from '../../src/source_mappers/source_map';
import { type DebugAPI } from './debug_api';
import { type RuntimeDebugAPI } from '../runtimes/runtime_api';
import {
  type SourceCFGNode,
  SourceControlFlowGraph,
} from '../../src/cfg/source_cfg';
import { WasmControlFlowGraph } from '../../src/cfg/wasm_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_operations';

export class ControlFlowGraphDBG implements DebugAPI {
  debuggerName: string = 'CFG_DBG';
  sourceMap: SourceMap;
  runtime: RuntimeDebugAPI;
  private readonly wcfgs: WasmControlFlowGraph;
  public readonly scfgs: SourceControlFlowGraph;

  constructor(sourceMap: SourceMap, runtime: RuntimeDebugAPI) {
    this.sourceMap = sourceMap;
    this.runtime = runtime;

    this.wcfgs = new WasmControlFlowGraph(sourceMap.wasm);
    this.scfgs = new SourceControlFlowGraph(new Map(), sourceMap, this.wcfgs);
  }

  async startDebugger(timeout: number): Promise<boolean> {
    return this.runtime.startRuntime(timeout);
  }

  async stopDebugger(timeout: number): Promise<boolean> {
    return this.runtime.stopRuntime(timeout);
  }

  async stepInto(
    location: SourceCodeLocation,
    timeout?: number,
  ): Promise<SourceCodeLocation> {
    const nodes = this.scfgs.nodesFromSourceLoc(location);
    if (nodes.length === 0) {
      throw new Error(
        `CFGStepInto: No node found for location ${sourceCodeLocationToString(location)}`,
      );
    }
    const destinationNodes = DebugOperations.stepIn(this.scfgs, nodes[0]);
    return await this.runningToDestinationNodes(destinationNodes, timeout);
  }

  async stepOut(
    location: SourceCodeLocation,
    timeout?: number,
    endAddress?: number[],
  ): Promise<SourceCodeLocation> {
    const nodes = this.scfgs.nodesFromSourceLoc(location);
    if (nodes.length === 0) {
      throw new Error(
        `CFGStepOut: No node found for location ${sourceCodeLocationToString(location)}`,
      );
    }
    const destinationNodes = DebugOperations.stepOut(this.scfgs, nodes[0]);
    return await this.runningToDestinationNodes(destinationNodes, timeout);
  }

  async stepOver(
    location: SourceCodeLocation,
    timeout?: number,
    endAddress?: number[],
  ): Promise<SourceCodeLocation> {
    const nodes = this.scfgs.nodesFromSourceLoc(location);
    if (nodes.length === 0) {
      throw new Error(
        `CFGStepOver: No node found for location ${sourceCodeLocationToString(location)}`,
      );
    }
    const destinationNodes = DebugOperations.stepOver(this.scfgs, nodes[0]);
    return await this.runningToDestinationNodes(destinationNodes, timeout);
  }

  private async runningToDestinationNodes(
    nodes: Array<[SourceCFGNode, number]>,
    timeout?: number,
  ): Promise<SourceCodeLocation> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise<SourceCodeLocation>(async (resolve) => {
      const bps = new Set<number>();
      const sourceMap = this.sourceMap;
      const runtime = this.runtime;
      const runtimeName = this.runtime.runtimeName;
      function onBreakpoint(bpAddr: number): void {
        if (bps.has(bpAddr)) {
          const locs = sourceMap.getOriginalPositionFor(bpAddr);
          if (locs.length === 0) {
            throw new Error(
              `No location found for address ${bpAddr} in runtime ${runtimeName}`,
            );
          }
          let idxRmv = 0;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for (const [_, addr] of nodes) {
            runtime
              .removeBreakpoint(addr, timeout)
              .then((removed) => {
                if (removed) {
                  idxRmv++;
                  bps.delete(addr);
                  if (idxRmv === nodes.length) {
                    runtime.removeOnBreakpoint(onBreakpoint);
                    resolve(locs[0]);
                  }
                } else {
                  throw new Error(
                    `Failed to add breakpoint on addr ${addr} in runtime ${runtimeName}`,
                  );
                }
              })
              .catch((err) => {
                throw new Error(
                  `Error occured while removing bp addr ${addr} in runtime ${runtimeName}: ${err}`,
                );
              });
          }
        } else {
          throw new Error(
            `An unexpected bp at addr ${bpAddr} got reached in runtime ${runtimeName}`,
          );
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [_, addr] of nodes) {
        const added = await this.runtime.addBreakpoint(addr, timeout);
        if (added) {
          bps.add(addr);
        } else {
          throw new Error(
            `Failed to add breakpoint on addr ${addr} in runtime ${this.runtime.runtimeName}`,
          );
        }
      }
      this.runtime.onBreakpoint(onBreakpoint);
      const running = await this.runtime.run(timeout);
      if (!running) {
        throw new Error(
          `Failed to run execution on runtime ${this.runtime.runtimeName}`,
        );
      }
    });
  }
}
