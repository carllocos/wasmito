import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { createLogger } from '../../src/logger/logger';
import {
  TimeoutConfig,
  BenchmarkMeasurement,
  logMeasurement,
  FailedMeasurement,
} from '../../src/util/benchmark_util';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';

const logger = createLogger('CoverageInstrAnalysis');
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
  const vmConnection = await spawnDevVM(wasm);
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const reached = new Set<number>();
  const markReachedBefore = (
    instr: WasmInstruction,
    _args: ReadOnlyWasmValue[],
  ): void => {
    reached.add(instr.startAddress);
  };

  const markReachedAfter = (
    instr: WasmInstruction,
    _result: ReadOnlyWasmValue | undefined,
  ): void => {
    reached.add(instr.startAddress);
  };

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();

  analysis.before(WasmCode.Br, markReachedBefore);
  analysis.before(WasmCode.BrIf, markReachedBefore);
  analysis.before(WasmCode.BrTable, markReachedBefore);

  analysis.before(WasmCode.Select, markReachedBefore);

  analysis.before(WasmCode.Call, markReachedBefore);
  analysis.before(WasmCode.CallIndirect, markReachedBefore);

  analysis.before(WasmCode.MultipleOpcode.Unary, markReachedBefore);
  analysis.before(WasmCode.MultipleOpcode.Binary, markReachedBefore);

  analysis.before(WasmCode.Drop, markReachedBefore);

  analysis.before(WasmCode.Return, markReachedBefore);

  analysis.before(WasmCode.MultipleOpcode.Const, markReachedBefore);

  analysis.before(WasmCode.MultipleOpcode.Local, markReachedBefore);
  analysis.before(WasmCode.MultipleOpcode.Global, markReachedBefore);

  analysis.before(WasmCode.MultipleOpcode.Load, markReachedBefore);
  analysis.before(WasmCode.MultipleOpcode.Store, markReachedBefore);

  analysis.before(WasmCode.MemorySize, markReachedBefore);
  analysis.before(WasmCode.MemoryGrow, markReachedBefore);

  analysis.before(WasmCode.Struct.Block, markReachedBefore);
  analysis.after(WasmCode.Struct.Block, markReachedAfter);
  analysis.before(WasmCode.Struct.Loop, markReachedBefore);
  analysis.after(WasmCode.Struct.Loop, markReachedAfter);
  analysis.before(WasmCode.Struct.If, markReachedBefore);
  analysis.after(WasmCode.Struct.If, markReachedAfter);

  analysis.before(WasmCode.NOP, markReachedBefore);

  const registerTime = logMeasurement(
    logger,
    startTimeRegister,
    Date.now(),
    'Registering Advices',
  );

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy(timeouts.timeoutMsDeploy);
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
      'Analysis Run',
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
