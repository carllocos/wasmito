import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  GlobalGetInstruction,
  GlobalSetInstruction,
  isGlobalGetInstruction,
  LoadInstruction,
  StoreInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { connectToExistingMCUVM, spawnDevVM, spawnMCUVM } from '../spawn_vm';
import {
  sourceCodeLocationToString,
  SourceMap,
} from '../../src/source_mappers/source_map';
import { WASM } from '../../src/webassembly/wasm';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';

const logger = createLogger('OrderViolation');

function locationToString(
  sourceMap: SourceMap | undefined,
  address: number,
): string {
  if (sourceMap === undefined) return `address 0x${address.toString(16)}`;
  return sourceMap
    .getOriginalPositionFor(address)
    .map(sourceCodeLocationToString)
    .join(', ');
}

const reportedErrorsGlobals = new Set<number>();
function logOrderViolation(
  sourceMap: SourceMap | undefined,
  i: GlobalGetInstruction | LoadInstruction,
  rangeRead: Array<number | bigint> = [],
): void {
  let logText = '';
  if (isGlobalGetInstruction(i)) {
    if (reportedErrorsGlobals.has(i.index)) return;

    logText = `Global #${i.index} was accessed without initialisation`;
    reportedErrorsGlobals.add(i.index);
  } else {
    logText = `instruction '0x${i.startAddress.toString(16)}: ${i.name}' reads unitiliased memory range [${rangeRead[0]},${rangeRead[1]}]`;
  }

  const posStr = locationToString(sourceMap, i.startAddress);
  console.log(`[Order Violation Detected] ${logText} at ${posStr}`);
}

function isRangeInitialised(
  range: Array<number | bigint>,
  initialisedMemory: Array<[number | bigint, number | bigint]>,
): boolean {
  let initialised = false;
  for (const [start, end] of initialisedMemory) {
    if (start <= range[0] && range[1] <= end) {
      initialised = true;
      break;
    }
  }
  return initialised;
}

function detectOrderViolation(
  analysis: WasmAnalysis,
  sourceMap: SourceMap | undefined,
): void {
  const initialisedGlobals = new Set<number>(
    analysis.wasm.globals.filter((g) => g.value > 0).map((g) => g.index),
  );
  analysis.before(
    WasmCode.GlobalSet,
    (i: GlobalSetInstruction, _args: ReadOnlyWasmValue[]) => {
      initialisedGlobals.add(i.index);
    },
  );

  analysis.before(
    WasmCode.GlobalGet,
    (i: GlobalGetInstruction, _args: ReadOnlyWasmValue[]) => {
      if (initialisedGlobals.has(i.index)) return;
      logOrderViolation(sourceMap, i);
    },
  );

  const initialisedMemory: Array<[number | bigint, number | bigint]> = [];
  analysis.before(
    WasmCode.MultipleOpcode.Store,
    (i: StoreInstruction, args: ReadOnlyWasmValue[]) => {
      const bytesWritten = i.targetValueSize();
      const memaddr = WASM.Arithmetic.add(i.offset, args[1].value);
      const range: [number | bigint, number | bigint] = [
        memaddr,
        WASM.Arithmetic.add(memaddr, bytesWritten),
      ];
      initialisedMemory.push(range);
    },
  );

  analysis.before(
    WasmCode.MultipleOpcode.Load,
    (i: LoadInstruction, args: ReadOnlyWasmValue[]) => {
      const addr = WASM.Arithmetic.add(i.offset, args[0].value);
      const bytesRead = i.targetValueSize();
      const rangeRead = [addr, WASM.Arithmetic.add(addr, bytesRead)];
      const initialised = isRangeInitialised(rangeRead, initialisedMemory);
      if (!initialised) logOrderViolation(sourceMap, i, rangeRead);
    },
  );
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
  loadSourceMap?: () => Promise<SourceMap>,
): Promise<BenchmarkMeasurement> {
  reportedErrorsGlobals.clear();
  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  const sourceMap = await loadSourceMap?.();
  const wasm = sourceMap?.wasm ?? new WasmModule(wasmPath);
  const parseTime = logMeasurement(
    logger,
    startTimeParse,
    Date.now(),
    'Wasm Parsing',
  );

  logger.info(`spawning & connecting to WARDuino...`);
  const startTimeSpawn = Date.now();
  const vmConnection = await spawnDevVM(wasm);
  const analysis = new WasmAnalysis(sourceMap ?? wasm, vmConnection);
  const spawnTime = logMeasurement(
    logger,
    startTimeSpawn,
    Date.now(),
    'Spawning VM',
  );

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  detectOrderViolation(analysis, sourceMap);
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
      errorRegister: `${registerTime}`,
      errorDeploy: `${deployTime}`,
      errorRun: `${errMsg}`,
    };
    return f;
  }
}
