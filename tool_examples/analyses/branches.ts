/***
 ** This is an implementation inspired by Wastrumentation's branch coverage analysis.
 ** Original source file found in:
 ** github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/branches/src/lib.rs
 **
 ** For every `if`/`if_then_else` and `br_if`, records the condition value
 ** last observed at that instruction; for every `br_table`, records the
 ** *effective* branch label last taken (the raw index resolved against the
 ** table, falling back to the default label -- see `effectiveBranchLabel`).
 ** The original exposes this as a `get_coverage(function_index,
 ** instruction_index)` function exported *from the instrumented Wasm
 ** module itself* (since Wastrumentation compiles the analysis into the
 ** binary); wasmito's analysis instead runs alongside the VM as a plain JS
 ** observer, so the same accessor is exposed here as a regular TS export
 ** (`getCoverage`) instead.
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  BranchTable,
  WasmInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from './target_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';

const logger = createLogger('BranchesAnalysis');

const coverage = new Map<number, Map<number, Array<number>>>();

function markAsTaken(
  i: WasmInstruction,
  targetIdx: number,
  maxTargets: number,
) {
  const fid = i.getEnclosingFunction().id;
  const instrAddr = i.startAddress;
  coverage.set(fid, coverage.get(fid) ?? new Map());
  const taken = coverage.get(fid)?.get(instrAddr) ?? Array(maxTargets).fill(0);
  taken[targetIdx]++;
  coverage.get(fid)?.set(instrAddr, taken);
}

function onIfOrBrIf(i: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  markAsTaken(i, (args[0].value as number) > 0 ? 1 : 0, 2);
}

function onBrTable(instr: BranchTable, args: ReadOnlyWasmValue[]): void {
  const target = args[0].value as number;
  const targets = instr.brachTargets;
  const idx = target < targets.length - 1 ? target : targets.length - 1;
  markAsTaken(instr, idx, targets.length);
}

function logCoverage(): void {
  console.log('key ((i64,i64)), val (i32)');
  for (const [funcIdx, perFunc] of coverage.entries()) {
    for (const [instrIdx, value] of perFunc.entries()) {
      console.log(`(${funcIdx},${instrIdx}), ${value}`);
    }
  }
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
): Promise<BenchmarkMeasurement> {
  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  const parseTime = logMeasurement(
    logger,
    startTimeParse,
    Date.now(),
    'Wasm Parsing',
  );

  logger.info(`spawning & connecting to WARDuino...`);
  const startTimeSpawn = Date.now();
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const spawnTime = logMeasurement(
    logger,
    startTimeSpawn,
    Date.now(),
    'Spawning VM',
  );

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();

  analysis.before(WasmCode.If, onIfOrBrIf);
  analysis.before(WasmCode.BrIf, onIfOrBrIf);
  analysis.before(WasmCode.BrTable, onBrTable);

  const registerTime = logMeasurement(
    logger,
    startTimeRegister,
    Date.now(),
    'Registering Advices',
  );

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  const deployTime = logMeasurement(
    logger,
    startTimeDeploy,
    Date.now(),
    'Deploy Hooks',
  );

  logger.info(`running WARDuino`);
  const analysisStartTime = Date.now();
  try {
    await analysis.run(logCoverage, timeouts.timeoutMsAnalysisRun);
    const analysisTime = logMeasurement(
      logger,
      analysisStartTime,
      Date.now(),
      'Analysis Completion',
    );
    return {
      wasmParsingMs: parseTime,
      vmSpawnMs: spawnTime,
      advicesRegistrationMs: registerTime,
      advicesDeploymentMs: deployTime,
      analysisRunMs: analysisTime,
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : e;
    const f: FailedMeasurement = {
      errorParsing: `${parseTime}`,
      errorSpawn: `${spawnTime}`,
      errorRegister: `${parseTime}`,
      errorDeploy: `${parseTime}`,
      errorRun: `${errMsg}`,
    };
    return f;
  }
}
