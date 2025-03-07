import { type SourceCodeLocation } from '../../src/source_mappers/source_map';
import { type DebugAPI } from '../debuggers/debug_api';
import { type BenchConfig } from './config';
import { benchOperation } from './bench_operation';

export async function benchStepInto(
  config: BenchConfig,
  startLoc: SourceCodeLocation,
  dbg: DebugAPI,
  stepUntilStartLocTimeout: number = 10000,
  stepIntoTimeout: number = 10000,
): Promise<void> {
  await benchOperation(
    config,
    startLoc,
    dbg,
    dbg.stepInto.bind(dbg),
    stepUntilStartLocTimeout,
    stepIntoTimeout,
  );
}
