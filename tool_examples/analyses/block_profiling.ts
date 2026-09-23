/***
 ** This is an implementation of Wasabi's analysis
 ** Original source file found in: github.com/aaronmunsters/wasabi/tree/master/examples/analyses
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { connectToExistingDevVM, spawnDevVM, spawnMCUVM } from '../spawn_vm';
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

const logger = createLogger('BlockProfiling');

const blockCount = new Map<number, Map<number, number>>();

function addBlockEnter(
  instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  const func = instr.getEnclosingFunction();
  const idx = instr.getIndexInFunction();

  const funCounts = blockCount.get(func.id) ?? new Map();
  const count = funCounts.get(idx) ?? 0;
  funCounts.set(idx, count + 1);
  blockCount.set(func.id, funCounts);
}

function addFuncEnter(func: WASMFunction, _args: ReadOnlyWasmValue[]): void {
  // const instr = func.allInstructions[0];
  const idx = 0;
  // const idx = instr.startAddress;
  const funCounts = blockCount.get(func.id) ?? new Map();
  const count = funCounts.get(idx) ?? 0;
  funCounts.set(idx, count + 1);
  blockCount.set(func.id, funCounts);
}

function csvLog() {
  console.log('fid,pc,counts');
  for (const [fid, countsFunc] of blockCount.entries()) {
    for (const [pc, counts] of countsFunc.entries())
      console.log(`${fid},${pc}, ${counts}`);
  }
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
  const startTimeSpawn = Date.now();
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await connectToExistingDevVM(wasm, 8192); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM

  const analysis = new WasmAnalysis(wasm, vmConnection);
  const spawnTime = logMeasurement(
    logger,
    startTimeSpawn,
    Date.now(),
    'Spawning VM',
  );
  logger.info(`registering advices...`);
  const startTimeRegister = Date.now();
  analysis.before(WasmCode.Struct.Func, addFuncEnter);
  analysis.before(WasmCode.If, addBlockEnter);
  analysis.before(WasmCode.Else, addBlockEnter);
  analysis.before(WasmCode.Struct.Block, addBlockEnter);
  analysis.before(WasmCode.Struct.Loop, addBlockEnter);
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
    await analysis.run(csvLog, timeouts.timeoutMsAnalysisRun);
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
