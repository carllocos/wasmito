import {
  type SourceCodeLocation,
  type SourceMap,
} from '../../src/source_mappers/source_map';
import { type DebugAPI } from './debug_api';
import { type RuntimeDebugAPI } from '../runtimes/runtime_api';

export class StepWiseDBG implements DebugAPI {
  debuggerName: string = 'StepWiseDBG';
  sourceMap: SourceMap;
  runtime: RuntimeDebugAPI;

  constructor(sourceMap: SourceMap, runtime: RuntimeDebugAPI) {
    this.sourceMap = sourceMap;
    this.runtime = runtime;
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
    let currentLoc: SourceCodeLocation = location;
    while (
      currentLoc.linenr === location.linenr &&
      currentLoc.colnr === location.colnr
    ) {
      await this.runtime.step(timeout);
      const pc = await this.runtime.inspectPC(timeout);
      const locs = this.sourceMap.getOriginalPositionFor(pc);
      if (locs.length > 0) currentLoc = locs[0];
    }

    if (
      currentLoc.linenr !== location.linenr ||
      currentLoc.colnr !== location.colnr
    ) {
      return currentLoc;
    } else {
      throw new Error(`Failed to apply stepInto`);
    }
  }

  async stepOut(
    location: SourceCodeLocation,
    timeout?: number,
    endAddress?: number[],
  ): Promise<SourceCodeLocation> {
    endAddress = endAddress ?? [];
    if (endAddress.length === 0) {
      throw new Error(
        `Current version of Stepwise stepout requires endAddress`,
      );
    }
    let currentLoc = location;
    let found = false;
    while (!found) {
      await this.runtime.step(timeout);
      const pc = await this.runtime.inspectPC(timeout);
      const locs = this.sourceMap.getOriginalPositionFor(pc);
      if (locs.length > 0) currentLoc = locs[0];
      found = endAddress.find((a) => a === currentLoc.address) !== undefined;
    }
    if (found) {
      return currentLoc;
    } else {
      throw new Error(`Failed to apply stepout`);
    }
  }

  async stepOver(
    location: SourceCodeLocation,
    timeout?: number,
    endAddress?: number[],
  ): Promise<SourceCodeLocation> {
    endAddress = endAddress ?? [];
    let currentLoc = location;
    let foundThroughAddress = false;
    while (
      !(currentLoc.linenr >= location.linenr + 1) &&
      !foundThroughAddress
    ) {
      await this.runtime.step(timeout);
      const pc = await this.runtime.inspectPC(timeout);
      const locs = this.sourceMap.getOriginalPositionFor(pc);
      if (locs.length > 0) currentLoc = locs[0];
      foundThroughAddress =
        endAddress.length !== 0 &&
        endAddress.find((a) => a === currentLoc.address) !== undefined;
    }
    if (currentLoc.linenr >= location.linenr + 1 || foundThroughAddress) {
      return currentLoc;
    } else {
      throw new Error(`Failed to apply stepOver`);
    }
  }
}
