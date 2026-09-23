/***
 ** An implementation of Whamm's CacheSim analysis:
 ** github.com/ejrgilbert/whamm/tree/master/tests/scripts/paper_eval/cache_sim/cache_sim-hw.mm
 **
 ** Like Whamm's analysis, this analysis also uses whamm/tests/libs/cache/cache.wasm)
 ***/
import { WasmModule } from '../../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../../src/tool_api/interrupts';
import {
  LoadInstruction,
  StoreInstruction,
} from '../../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from '../target_vm';
import { loadWasiLibrary } from '../../wasm_library';
import { createLogger } from '../../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../../src/util/benchmark_util';
import { WasmCode } from '../../../src/webassembly/wasm/wasm_opcode';
import path from 'path';

const logger = createLogger('CacheSimulatorAnalysis');

const cacheLibPath = path.resolve(
  './tool_examples/analyses/cache_simulator/libs/cache.wasm',
);

let checkAccess: ((addr: number, dataSize: number) => number) | undefined;

interface CacheStat {
  fid: number;
  hit: number;
  miss: number;
}

const stats = new Map<number, CacheStat>();

function access(
  instr: LoadInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
): void {
  const addr = instr.startAddress;
  const s = stats.get(addr) ?? {
    fid: instr.getEnclosingFunction().id,
    hit: 0,
    miss: 0,
  };
  const effectiveAddr = Number(args[0].value) + instr.offset;
  const result = checkAccess!(effectiveAddr, instr.targetValueSize());

  s.hit += (result & 0xffff0000) >> 16;
  s.miss += result & 0x0000ffff;
  stats.set(addr, s);
}

function logStats(): void {
  console.log('id (fid, instr addr), hit (u32), miss (u32)');
  for (const [instr, s] of stats.entries()) {
    console.log(`(${s.fid},${instr}), ${s.hit}, ${s.miss}`);
  }
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
): Promise<BenchmarkMeasurement> {
  logger.info(`loading cache library '${cacheLibPath}'`);
  const cacheLib = await loadWasiLibrary(cacheLibPath);
  checkAccess = cacheLib.check_access as (
    addr: number,
    dataSize: number,
  ) => number;

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
  const startTimeRegister = Date.now();
  analysis.before(WasmCode.MultipleOpcode.Store, access);
  analysis.before(WasmCode.MultipleOpcode.Load, access);
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
    await analysis.run(logStats, timeouts.timeoutMsAnalysisRun);
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
