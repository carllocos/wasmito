/***
 ** This is an implementation of the Safe heap analysis as provided by Wastrumentation
 ** Original source file found in: https://github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/denan/src/lib.rs
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { connectToExistingDevVM, spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { WASM } from '../../src/webassembly/wasm';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';

const logger = createLogger('DenanAnalysis');

function denan(v: WritableWasmValue): WritableWasmValue {
  console.log(`Try denan: ${WASM.typeToString(v.type)}.const ${v.value}`);
  switch (true) {
    case WritableWasmValue.isF32Const(v):
    case WritableWasmValue.isF64Const(v):
      if (isNaN(v.value)) {
        v.value = 0.0;
        console.log(`Denan to ${v.value}`);
      }
  }
  return v;
}

function denanResult(
  instr: WasmInstruction,
  result: WritableWasmValue | undefined,
): WritableWasmValue | undefined {
  const f = instr.getEnclosingFunction();
  console.log(
    `After In function ${f.id} instr ${instr.startAddress} NAME=${instr.name}`,
  );
  if (result === undefined) return undefined;
  return denan(result);
}

function denanResultCall(
  func: WASMFunction,
  result: WritableWasmValue | undefined,
): WritableWasmValue | undefined {
  console.log(`After call func ${func.id}`);
  if (result === undefined) return undefined;
  return denan(result);
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
  // const vmConnection = await connectToExistingDevVM(wasm, 8192);
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.afterMut(WasmCode.MultipleOpcode.Const, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Local, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Global, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Load, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Store, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Unary, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Binary, denanResult);
  analysis.afterMut(WasmCode.Struct.Func, denanResultCall);

  const registerTime = logMeasurement(
    logger,
    startTimeRegister,
    Date.now(),
    'Registering Advices',
  );

  logger.info(`Deploying Advices...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  const deployTime = logMeasurement(
    logger,
    startTimeDeploy,
    Date.now(),
    'Deploy Hooks',
  );

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
