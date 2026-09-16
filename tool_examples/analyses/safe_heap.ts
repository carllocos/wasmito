/***
 ** This is an implementation of the Safe heap analysis as provided by Wastrumentation
 ** Original source file found in: https://github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/safe-heap/src/lib.rs
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  ReadOnlyWasmValue,
  WritableWasmValue,
} from '../../src/tool_api/interrupts';
import {
  LoadInstruction,
  StoreInstruction,
  WasmInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';
import { WASM } from '../../src/webassembly/wasm';
import assert from 'assert';

const logger = createLogger('SafeHeapAnalysis');
const memoryPageSize = 2 ** 16;
let currentMemoryPages = 0;
let addPages = 0;

function recordMemoryGrow(_instr: WasmInstruction, args: ReadOnlyWasmValue[]) {
  addPages = args[0].value as number;
}

function addMemPages(
  _instr: WasmInstruction,
  success: ReadOnlyWasmValue | undefined,
) {
  assert(success !== undefined);
  if (success.value !== -1) {
    currentMemoryPages += addPages;
    addPages = 0;
  }
}

function updateCurrentMemPages(
  _instr: WasmInstruction,
  currentSize: ReadOnlyWasmValue | undefined,
) {
  assert(currentSize !== undefined);
  currentMemoryPages = currentSize.value as number;
}

function assertSafeHeap(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    console.log('trap thrown');
    throw new Error(message);
  }
}

function boundCheck(
  index: number | bigint,
  bytes: number,
  offset: number,
): void {
  const addr = WASM.Arithmetic.add(offset, index); //offset is the statically encoded offset, index the dynamic stack offset
  const lastTargetByte = WASM.Arithmetic.add(addr, bytes);
  console.log(
    `bounds_check(index=${index}, bytes=${bytes},offset=${offset}, target=${lastTargetByte})`,
  );

  assertSafeHeap(lastTargetByte != 0, 'not zero');
  assertSafeHeap(
    lastTargetByte <= currentMemoryPages * memoryPageSize,
    'memory overflow',
  );
}

function alignmentCheck(index: number | bigint, size: number): void {
  console.log(`aligment_check(index=${index}, size=${size})`);
  assertSafeHeap(
    WASM.Arithmetic.bitAnd(index, size - 1) === 0,
    'alignment check fails',
  );
}

function safeLoad(
  load: LoadInstruction,
  args: WritableWasmValue[],
): WritableWasmValue[] {
  const f = load.getEnclosingFunction();
  console.log(
    `In function ${f.id} instr ${load.startAddress} NAME=${load.name}`,
  );
  boundCheck(args[0].value, load.targetValueSize(), load.offset);
  alignmentCheck(args[0].value, load.targetValueSize());
  return args;
}

function safeStore(
  store: StoreInstruction,
  args: WritableWasmValue[],
): WritableWasmValue[] {
  const f = store.getEnclosingFunction();
  console.log(
    `In function ${f.id} instr ${store.startAddress} NAME=${store.name}`,
  );
  boundCheck(args[0].value, store.targetValueSize(), store.offset);
  alignmentCheck(args[0].value, store.targetValueSize());
  return args;
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
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  currentMemoryPages = wasm.initialMemoryPages;
  const analysis = new WasmAnalysis(wasm, vmConnection);

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.before(WasmCode.MemoryGrow, recordMemoryGrow);
  analysis.after(WasmCode.MemoryGrow, addMemPages);
  analysis.after(WasmCode.MemorySize, updateCurrentMemPages);
  analysis.beforeMut(WasmCode.MultipleOpcode.Load, safeLoad);
  analysis.beforeMut(WasmCode.MultipleOpcode.Store, safeStore);
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
    await analysis.run(timeouts.timeoutMsAnalysisRun);
    const analysisTime = logMeasurement(
      logger,
      analysisStartTime,
      Date.now(),
      'Analysis Completion',
    );
    return {
      wasmParsingMs: parseTime,
      advicesRegistrationMs: registerTime,
      advicesDeploymentMs: deployTime,
      analysisRunMs: analysisTime,
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : e;
    const f: FailedMeasurement = {
      errorParsing: `${parseTime}`,
      errorRegister: `${parseTime}`,
      errorDeploy: `${parseTime}`,
      errorRun: `${errMsg}`,
    };
    return f;
  }
}
