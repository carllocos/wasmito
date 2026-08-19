/***
 ** This is an implementation of Wasabi's analysis
 ** Original source file found in: github.com/aaronmunsters/wasabi/tree/master/examples/analyses
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
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

const counts = new Map<string, number>();
function increaseCount(
  instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  counts.set(instr.name, (counts.get(instr.name) ?? 0) + 1);
  console.log(`${instr.name} (#${counts.get(instr.name)})`);
}

const logger = createLogger('InstructionMixAnalysis');

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
  const analysis = new WasmAnalysis(wasm, vmConnection);

  logger.info(`Registering Advices...`);
  // hooks that correspond direclty to one instruction
  const startTimeRegister = Date.now();
  analysis.before(WasmCode.NOP, increaseCount);
  analysis.before(WasmCode.Unreachable, increaseCount);
  analysis.before(WasmCode.If, increaseCount);
  analysis.before(WasmCode.Br, increaseCount);
  analysis.before(WasmCode.BrIf, increaseCount);
  analysis.before(WasmCode.BrTable, increaseCount);
  analysis.before(WasmCode.Drop, increaseCount);
  analysis.before(WasmCode.Select, increaseCount);
  analysis.before(WasmCode.MemorySize, increaseCount);
  analysis.before(WasmCode.MemoryGrow, increaseCount);

  // Hooks that correspond to multiple instructions
  analysis.before(WasmCode.MultipleOpcode.Unary, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Binary, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Load, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Store, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Local, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Global, increaseCount);

  // Special cases
  analysis.before(WasmCode.Call, increaseCount);
  analysis.before(WasmCode.CallIndirect, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Const, increaseCount);
  analysis.before(WasmCode.Return, increaseCount);
  // analysis.begin(...) // TODO begin
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
