/***
 ** This is an implementation of Whamm's memory access tracing analysis
 ** Original source file found in:
 ** github.com/ejrgilbert/whamm/blob/master/tests/scripts/paper_eval/mem_access_tracing/mem_access.mm
 **
 ** Counts, for every effective address (`addr + offset`), how many times it
 ** is read (load) and written (store), and reports it as a CSV, sorted by
 ** address and then by `is_write`, i.e. the way Whamm's `print_map_as_csv`
 ** does. NOTE: the original also traces `*atomic_rmw*` instructions, which
 ** are not supported by WARDuino.
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  isStoreInstruction,
  LoadInstruction,
  StoreInstruction,
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

type EffectiveAddr = number | bigint;
const accesses = new Map<EffectiveAddr, { reads: number; writes: number }>();

function access(
  instr: LoadInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
): void {
  const addr: EffectiveAddr = WASM.Arithmetic.add(instr.offset, args[0].value);
  const counts = accesses.get(addr) ?? { reads: 0, writes: 0 };
  if (isStoreInstruction(instr)) counts.writes++;
  else counts.reads++;
  accesses.set(addr, counts);
}

function logAccesses(): void {
  if (accesses.size === 0) {
    console.log('empty map');
    return;
  }
  console.log('key ((i32,bool)), val (i32)');
  const addrs = [...accesses.keys()].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  for (const addr of addrs) {
    const { reads, writes } = accesses.get(addr)!;
    if (reads > 0) console.log(`(${addr},false), ${reads}`);
    if (writes > 0) console.log(`(${addr},true), ${writes}`);
  }
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
  const startTimeSpawn = Date.now();
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const spawnTime = logMeasurement(
    logger,
    startTimeSpawn,
    Date.now(),
    'Spawning VM',
  );

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
    await analysis.run(logAccesses, timeouts.timeoutMsAnalysisRun);
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
