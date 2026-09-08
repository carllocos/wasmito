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
  console.log(
    `In function ${func.id} instr ${instr.startAddress} NAME=${instr.name}`,
  );
  return;
}

export function getCount(
  wasm: WasmModule,
  fid: number,
  instrIdx: number,
): number {
  const f = wasm.getFunction(fid);
  if (f === undefined) return 0;
  const i = f.allInstructions[instrIdx];
  if (i === undefined) return 0;
  return blockCount.get(f.id)?.get(instrIdx) ?? 0;
}

const logger = createLogger('BlockProfilingAnalysis');

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
  // const vmConnection = await connectToExistingDevVM(wasm, 8192); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM

  const analysis = new WasmAnalysis(wasm, vmConnection);
  logger.info(`registering advices...`);
  const startTimeRegister = Date.now();
  analysis.before(WasmCode.If, addBlockEnter);
  analysis.before(WasmCode.Else, addBlockEnter);
  analysis.before(WasmCode.Call, addBlockEnter);
  analysis.before(WasmCode.CallIndirect, addBlockEnter);
  analysis.before(WasmCode.Block, addBlockEnter);
  analysis.before(WasmCode.Loop, addBlockEnter);
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
      advicesRegistrationMs: registerTime,
      advicesDeploymentMs: deployTime,
      analysisRunMs: analysisTime,
    };
    return m;
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
