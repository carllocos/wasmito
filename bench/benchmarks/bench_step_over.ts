import { type SourceCodeLocation } from '../../src/source_mappers/source_map';
import { type DebugAPI } from '../debuggers/debug_api';
import { type BenchConfig } from './config';
import { benchOperation } from './bench_operation';

export async function benchStepOver(
  config: BenchConfig,
  startLoc: SourceCodeLocation,
  dbg: DebugAPI,
  endAddres?: number[],
  stepUntilStartLocTimeout?: number,
  stepOvertimeout?: number,
): Promise<void> {
  const maxNumber = 10000000;
  if (stepUntilStartLocTimeout === undefined) {
    stepUntilStartLocTimeout = maxNumber;
  }
  if (stepOvertimeout === undefined) {
    stepOvertimeout = maxNumber;
  }
  async function so(
    l: SourceCodeLocation,
    t?: number,
  ): Promise<SourceCodeLocation> {
    return dbg.stepOver(l, t, endAddres);
  }
  await benchOperation(
    config,
    startLoc,
    dbg,
    so,
    // dbg.stepOver.bind(dbg),
    stepUntilStartLocTimeout,
    stepOvertimeout,
  );
}
