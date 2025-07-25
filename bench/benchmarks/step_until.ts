import {
  sourceCodeLocationToString,
  type SourceCodeLocation,
} from '../../src/source_mappers/source_map';
import { type DebugAPI } from '../debuggers/debug_api';

export async function stepUntilLineCol(
  untilLoc: SourceCodeLocation,
  dbg: DebugAPI,
  timeout?: number,
): Promise<[SourceCodeLocation, number]> {
  let nrOfSteps = 0;
  let currentLoc: undefined | SourceCodeLocation;
  let found = false;
  if (untilLoc.address !== -1) {
    await runUntilBreakpoint(dbg, untilLoc.address);
    const locsFound = dbg.sourceMap.getOriginalPositionFor(untilLoc.address);
    if (locsFound.length > 0) {
      currentLoc = locsFound[0];
      if (
        currentLoc.linenr !== untilLoc.linenr ||
        currentLoc.colnr !== untilLoc.colnr ||
        !currentLoc.source.endsWith(untilLoc.source)
      ) {
        throw new Error(
          `reached location '${sourceCodeLocationToString(currentLoc)}' does not match desired location ${sourceCodeLocationToString(untilLoc)}`,
        );
      }
    } else {
      throw new Error(`no location found for address ${untilLoc.address}`);
    }
  } else {
    while (!found) {
      const stepped = await dbg.runtime.step(timeout);
      if (!stepped) {
        throw new Error(`DBG ${dbg.debuggerName} failed to step`);
      }

      nrOfSteps += 1;
      const pc = await dbg.runtime.inspectPC(timeout);
      const locsFound = dbg.sourceMap.getOriginalPositionFor(pc);
      if (locsFound.length > 0) {
        currentLoc = locsFound[0];
        if (untilLoc.address !== -1) {
          found = currentLoc.address === untilLoc.address;
        } else {
          found =
            currentLoc.source.endsWith(untilLoc.source) &&
            currentLoc.linenr === untilLoc.linenr &&
            currentLoc.colnr === untilLoc.colnr;
        }
      }
    }

    if (currentLoc === undefined) {
      throw new Error(
        `Failed to step until ${sourceCodeLocationToString(untilLoc)})`,
      );
    }
  }
  return [currentLoc, nrOfSteps];
}

async function runUntilBreakpoint(dbg: DebugAPI, addr: number): Promise<void> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    function onbp(a: number): void {
      if (a !== addr) {
        throw new Error(`reached unexpected bp ${a} expecting ${addr}`);
      }
      dbg.runtime.removeOnBreakpoint(onbp);
      dbg.runtime
        .removeBreakpoint(addr)
        .then(() => {
          resolve();
        })
        .catch((e) => {
          throw new Error(
            `error occurred while removing breakpoint at addr ${addr}: ${e}`,
          );
        });
    }
    dbg.runtime.onBreakpoint(onbp);
    await dbg.runtime.addBreakpoint(addr);
    await dbg.runtime.run();
  });
}
