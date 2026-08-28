/***
 ** This is an implementation of Wasabi's analysis
 ** Original source file found in: github.com/aaronmunsters/wasabi/tree/master/examples/analyses
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  isLoadInstruction,
  isStoreInstruction,
  LoadInstruction,
  StoreInstruction,
  WasmInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';
import { WASM } from '../../src/webassembly/wasm';
const logger = createLogger('MemoryTracingAnalysis');

type Access = [number, WasmInstruction, number | bigint, boolean];
const accesses: Access[] = [];
function access(
  instr: LoadInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
): void {
  const fid = instr.getEnclosingFunction().id;
  const addr = WASM.Arithmetic.add(
    instr.offset,
    args[isLoadInstruction(instr) ? 0 : 1].value,
  );
  const a: Access = [fid, instr, addr, isStoreInstruction(instr)];
  accesses.push(a);
  console.log(`Function ${fid} instruction ${instr.getIndexInFunction()}`);
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
): Promise<BenchmarkMeasurement> {
  logger.info(`Parsing Wasm module '${wasmPath}'`);
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
  const analysis = new WasmAnalysis(wasm, vmConnection);

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.before(WasmCode.MultipleOpcode.Load, access);
  analysis.before(WasmCode.MultipleOpcode.Store, access);
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
