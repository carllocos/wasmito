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
      `function ${f.id} index ${instr.getIndexInFunction()} (counts #${newS.size})`,
    );
  };

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      analysis.before(i, cb);
    }
  }
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
