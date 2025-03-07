import { type SourceCodeLocation } from '../../src/source_mappers/source_map';
import { type DebugAPI } from '../debuggers/debug_api';
import { type BenchConfig } from './config';
import { benchOperation } from './bench_operation';

export async function benchStepOut(
  config: BenchConfig,
  startLoc: SourceCodeLocation,
  dbg: DebugAPI,
  endAddres?: number[],
  stepUntilStartLocTimeout?: number,
  stepOuttimeout?: number,
): Promise<void> {
  const maxNumber = 10000000;
  if (stepUntilStartLocTimeout === undefined) {
    stepUntilStartLocTimeout = maxNumber;
  }
  if (stepOuttimeout === undefined) {
    stepOuttimeout = maxNumber;
  }
  async function so(
    l: SourceCodeLocation,
    t?: number,
  ): Promise<SourceCodeLocation> {
    return dbg.stepOut(l, t, endAddres);
  }
  await benchOperation(
    config,
    startLoc,
    dbg,
    so,
    stepUntilStartLocTimeout,
    stepOuttimeout,
  );
}
