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
  const coverage = new Map<number, Set<number>>();
  const cb = (instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void => {
    const f = instr.getEnclosingFunction();
    const s = coverage.get(f.id) ?? new Set<number>();
    const newS = s.add(instr.startAddress);
    coverage.set(f.id, newS);
    console.log(
      `In function ${f.id} instr ${instr.startAddress} NAME=${instr.name}`,
    );
  };

  const cbAfter = (
    instr: WasmInstruction,
    _result: ReadOnlyWasmValue | undefined,
  ): void => {
    const f = instr.getEnclosingFunction();
    const s = coverage.get(f.id) ?? new Set<number>();
    const newS = s.add(instr.startAddress);
    coverage.set(f.id, newS);
    console.log(
      `In function ${f.id} instr ${instr.startAddress} NAME=${instr.name}`,
    );
  };

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();

  analysis.before(WasmCode.If, cb);
  analysis.after(WasmCode.If, cbAfter);

  analysis.before(WasmCode.Br, cb);
  analysis.before(WasmCode.BrIf, cb);
  analysis.before(WasmCode.BrTable, cb);

  analysis.before(WasmCode.Select, cb);

  analysis.before(WasmCode.Call, cb);
  analysis.after(WasmCode.Call, cbAfter);
  analysis.before(WasmCode.CallIndirect, cb);
  analysis.after(WasmCode.CallIndirect, cbAfter);

  analysis.before(WasmCode.MultipleOpcode.Unary, cb);
  analysis.before(WasmCode.MultipleOpcode.Binary, cb);

  analysis.before(WasmCode.Drop, cb);

  analysis.before(WasmCode.Return, cb);

  analysis.before(WasmCode.MultipleOpcode.Const, cb);

  analysis.before(WasmCode.MultipleOpcode.Local, cb);
  analysis.before(WasmCode.MultipleOpcode.Global, cb);

  analysis.before(WasmCode.MultipleOpcode.Load, cb);
  analysis.before(WasmCode.MultipleOpcode.Store, cb);

  analysis.before(WasmCode.MemorySize, cb);
  analysis.before(WasmCode.MemoryGrow, cb);

  analysis.before(WasmCode.Block, cb);
  analysis.after(WasmCode.Block, cbAfter);
  analysis.before(WasmCode.Loop, cb);
  analysis.after(WasmCode.Loop, cbAfter);

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
