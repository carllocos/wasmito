import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { spawnDevVM } from '../spawn_vm';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';

const logger = createLogger('No Analysis');

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

  const analysis = new WasmAnalysis(wasm, vmConnection);
  const spawnTime = logMeasurement(
    logger,
    startTimeSpawn,
    Date.now(),
    'Spawning VM',
  );
  logger.info(`registering advices...`);
  const startTimeRegister = Date.now();
  const registerTime = logMeasurement(
    logger,
    startTimeRegister,
    Date.now(),
    'Registering Advices',
  );
  logger.info(`deploying advices...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  const deployTime = logMeasurement(
    logger,
    startTimeDeploy,
    Date.now(),
    'Deploy Hooks',
  );
  logger.info(`running WARDuino`);
  const startAnalysis = Date.now();
  try {
    await analysis.run(timeouts.timeoutMsAnalysisRun);
    const analysisTime = logMeasurement(
      logger,
      startAnalysis,
      Date.now(),
      'Analysis Run',
    );
    const m: BenchmarkMeasurement = {
      wasmParsingMs: parseTime,
      vmSpawnMs: spawnTime,
      advicesRegistrationMs: registerTime,
      advicesDeploymentMs: deployTime,
      analysisRunMs: analysisTime,
    };
    return m;
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
