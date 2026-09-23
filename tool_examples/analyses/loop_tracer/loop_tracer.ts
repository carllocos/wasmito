/***
 ** An implementation of Whamm's LoopTracer analysis:
 ** github.com/ejrgilbert/whamm/blob/master/tests/scripts/paper_eval/loop_tracer/loop_tracer.mm
 **
 ** Like Whamm's analysis, this analysis uses library whamm/tests/libs/loop_tracer/tracer.wasm
 **
 ***/
import { WasmModule } from '../../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../../src/tool_api/interrupts';
import {
  BranchTable,
  WasmInstruction,
} from '../../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from '../target_vm';
import { loadWasiLibrary } from '../../wasm_library';
import { WasmCode } from '../../../src/webassembly/wasm/wasm_opcode';
import { createLogger } from '../../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../../src/util/benchmark_util';
import path from 'path';
import { WASMFunction } from '../../../src/webassembly/wasm/wasm_function';

const logger = createLogger('LoopTracerAnalysis');

/**
 * Tracer Lib API
 */
const tracerLibPath = path.resolve(
  './tool_examples/analyses/loop_tracer/libs/tracer.wasm',
);
let initAnchor: ((fid: number, pc: number) => number) | undefined;
let onAnchor: ((anchorId: number) => void) | undefined;
let onIfTracer: ((arg0: number) => void) | undefined;
let onBrTableTracer: ((target: number) => void) | undefined;
let flushCsv: (() => void) | undefined;

async function loadTracerLib(): Promise<void> {
  const tracerLib = await loadWasiLibrary(tracerLibPath);
  initAnchor = tracerLib.init_anchor as (fid: number, pc: number) => number;
  onAnchor = tracerLib.on_anchor as (anchorId: number) => void;
  onIfTracer = tracerLib.on_if as (arg0: number) => void;
  onBrTableTracer = tracerLib.on_br_table as (target: number) => void;
  flushCsv = tracerLib.flush_csv as () => void;
}
/**
 * End Tracer Lib API
 */

const entryAnchors = new Map<number, number>();
const loopAnchors = new Map<number, number>();

function anchorOf(
  anchors: Map<number, number>,
  key: number,
  fid: number,
  pc: number,
): number {
  let id = anchors.get(key);
  if (id === undefined) {
    id = initAnchor!(fid, pc);
    anchors.set(key, id);
  }
  return id;
}

function onIfOrBrIf(_i: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  onIfTracer!(Number(args[0].value));
}

function onBrTable(instr: BranchTable, args: ReadOnlyWasmValue[]): void {
  const targets = instr.brachTargets;
  // const idx = Number(args[0].value) >>> 0;
  const idx = Number(args[0].value);
  onBrTableTracer!(idx < targets.length - 1 ? idx : targets.length - 1);
}

function onLoop(i: WasmInstruction, _args: ReadOnlyWasmValue[]): void {
  const f = i.getEnclosingFunction();
  const pc = i.getIndexInFunction() + 1; // +1 to match Whamm's pc convention
  onAnchor!(anchorOf(loopAnchors, i.startAddress, f.id, pc));
}

function onFunCall(f: WASMFunction, _args: ReadOnlyWasmValue[]): void {
  onAnchor!(anchorOf(entryAnchors, f.id, f.id, 0));
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
): Promise<BenchmarkMeasurement> {
  logger.info(`loading tracer library '${tracerLibPath}'`);
  await loadTracerLib();

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
  analysis.before(WasmCode.Struct.Func, onFunCall);
  analysis.before(WasmCode.Struct.Loop, onLoop);
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
    await analysis.run(flushCsv!, timeouts.timeoutMsAnalysisRun);
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
