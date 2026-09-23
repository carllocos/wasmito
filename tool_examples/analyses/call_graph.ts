/***
 ** This is an implementation based on Whamm's call graph
 ** Original source file found in: github.com/ejrgilbert/whamm/blob/master/tests/scripts/paper_eval/call_graph/call_graph.mm
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
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';
const logger = createLogger('CallGraphAnalysis');

const callGraph = new Map<number, Map<number, number>>();
let caller = -1;

function onCalleeEntry(callee: WASMFunction, _args: ReadOnlyWasmValue[]): void {
  if (caller >= 0) {
    const counts = callGraph.get(caller) ?? new Map();
    counts.set(callee.id, (counts.get(callee.id) ?? 0) + 1);
    callGraph.set(caller, counts);
  }
}

function onCall(call: WasmInstruction, _args: ReadOnlyWasmValue[]): void {
  caller = call.getEnclosingFunction().id;
}

function csvLogGraph() {
  console.log('key ((i32,i32)), val (i32)');
  for (const [caller, calleeCounts] of callGraph.entries()) {
    for (const [callee, counts] of calleeCounts.entries())
      console.log(`(${caller},${callee}), ${counts}`);
  }
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
): Promise<BenchmarkMeasurement> {
  logger.info(`Parsing WasmModule '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  const parseTime = logMeasurement(
    logger,
    startTimeParse,
    Date.now(),
    'Wasm Parsing',
  );

  logger.info(`spawning & connection to WARDuino...`);
  const startTimeSpawn = Date.now();
  const vmConnection = await spawnDevVM(wasm); // for local VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const spawnTime = logMeasurement(
    logger,
    startTimeSpawn,
    Date.now(),
    'Spawning VM',
  );

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.before(WasmCode.Call, onCall);
  analysis.before(WasmCode.CallIndirect, onCall);
  analysis.before(WasmCode.Struct.Func, onCalleeEntry);

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

  logger.info(`running VM`);
  const analysisStartTime = Date.now();
  try {
    await analysis.run(csvLogGraph, timeouts.timeoutMsAnalysisRun);
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
