/***
 ** This is an implementation of the Forward analysis as provided by Wastrumentation
 ** Original source file found in: https://github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/forward/src/lib.rs
 **
 ** The analysis intercepts every supported instruction and forwards the
 ** intercepted values back to the VM unchanged. Advices that return a value in
 ** the original analysis are registered as mutable hooks (`beforeMut`/`afterMut`)
 ** that hand the values back as-is; advices without a return value are
 ** registered as plain `before`/`after` hooks with an empty body.
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { connectToExistingDevVM, spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';
import { HeapUsageProbe } from '../../src/util/heap_usage_probe';

const logger = createLogger('ForwardAnalysis');

// Forwards the operands an instruction is about to consume (e.g. the if/br_if/
// select condition, br_table target, call_indirect table index, unary/binary
// operands, load/store address & value, memory.grow delta).
function forwardArgs(
  _instr: WasmInstruction,
  args: WritableWasmValue[],
): WritableWasmValue[] {
  return args;
}

// Forwards the value an instruction produced (const, local, global,
// memory.size).
function forwardResult(
  _instr: WasmInstruction,
  result: WritableWasmValue | undefined,
): WritableWasmValue | undefined {
  return result;
}

// Advices without a return value in the original analysis.
function noop(): void {}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
  _loadSourceMap?: unknown,
  heapProbe?: HeapUsageProbe,
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
  // const vmConnection = await connectToExistingDevVM(wasm, 8192);
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

  // if_then_else / if_then: forward the path continuation (condition)
  analysis.beforeMut(WasmCode.Struct.If, forwardArgs);
  analysis.after(WasmCode.Struct.If, noop);

  // branches
  analysis.before(WasmCode.Br, noop);
  analysis.beforeMut(WasmCode.BrIf, forwardArgs);
  analysis.beforeMut(WasmCode.BrTable, forwardArgs);

  analysis.beforeMut(WasmCode.Select, forwardArgs);

  // calls
  analysis.before(WasmCode.Call, noop);
  analysis.after(WasmCode.Call, noop);
  analysis.beforeMut(WasmCode.CallIndirect, forwardArgs);
  analysis.after(WasmCode.CallIndirect, noop);

  // numeric operations: forward the operands, the VM applies the operator
  analysis.beforeMut(WasmCode.MultipleOpcode.Unary, forwardArgs);
  analysis.beforeMut(WasmCode.MultipleOpcode.Binary, forwardArgs);

  analysis.before(WasmCode.Drop, noop);
  analysis.before(WasmCode.Return, noop);

  // values produced by the instruction
  analysis.afterMut(WasmCode.MultipleOpcode.Const, forwardResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Local, forwardResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Global, forwardResult);

  // memory: forward address/value operands, the VM performs the access
  analysis.beforeMut(WasmCode.MultipleOpcode.Load, forwardArgs);
  analysis.beforeMut(WasmCode.MultipleOpcode.Store, forwardArgs);
  analysis.afterMut(WasmCode.MemorySize, forwardResult);
  analysis.beforeMut(WasmCode.MemoryGrow, forwardArgs);

  // blocks & loops
  analysis.before(WasmCode.Struct.Block, noop);
  analysis.after(WasmCode.Struct.Block, noop);
  analysis.before(WasmCode.Struct.Loop, noop);
  analysis.after(WasmCode.Struct.Loop, noop);

  const registerTime = logMeasurement(
    logger,
    startTimeRegister,
    Date.now(),
    'Registering Advices',
  );

  logger.info(`Deploying Advices...`);
  if (heapProbe) await heapProbe.beforeDeploy(vmConnection);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  const deployTime = logMeasurement(
    logger,
    startTimeDeploy,
    Date.now(),
    'Deploy Hooks',
  );
  if (heapProbe) await heapProbe.afterDeploy(vmConnection);

  logger.info(`Running WARDuino`);
  const startTimeAnalysis = Date.now();
  try {
    await analysis.run(timeouts.timeoutMsAnalysisRun);
    const analysisTime = logMeasurement(
      logger,
      startTimeAnalysis,
      Date.now(),
      'Analysis Completed',
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
