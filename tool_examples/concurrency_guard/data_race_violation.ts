import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { StoreInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { connectToExistingMCUVM, spawnDevVM, spawnMCUVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BoardBaudRate } from '../../src/util/serial_port';
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

const logger = createLogger('DataRaceViolation');

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

type WasmNumber = number | bigint;
type MemRange = [WasmNumber, WasmNumber];

const alreadLogged = new Set<string>();

function logPossibleDataRace(
  sourceMap: SourceMap | undefined,
  i: StoreInstruction,
  range1: MemRange,
  range2: MemRange,
): void {
  const r1 = range1[0] < range2[0] ? range1 : range2;
  const r2 = range1[0] > range2[0] ? range1 : range2;
  const logText = `instruction '0x${i.startAddress.toString(16)}: ${i.name}' causes possible data range in memory ranges [${r1[0]},${r1[1]}] and [${r2[0]},${r2[1]}]`;

  const posStr = locationToString(sourceMap, i.startAddress);
  const logStr = `[Data Race Detected] ${logText} at ${posStr}`;
  if (!alreadLogged.has(logStr)) {
    console.log(logStr);
    alreadLogged.add(logStr);
  }
}

function getNeighbourRange(
  ranges: Array<MemRange>,
  range: MemRange,
): MemRange | undefined {
  const [memStart, memEnd] = range;
  for (const [start, end] of ranges) {
    if (end === memStart || start === memEnd) {
      return [start, end];
    }
  }
  return undefined;
}

function detectDataRace(
  analysis: WasmAnalysis,
  sourceMap: SourceMap | undefined,
): void {
  const ranges: Array<MemRange> = [];
  analysis.before(
    WasmCode.MultipleOpcode.Store,
    (i: StoreInstruction, args: ReadOnlyWasmValue[]) => {
      const bytesWritten = i.targetValueSize();
      const memaddr = WASM.Arithmetic.add(i.offset, args[0].value);
      const range: MemRange = [
        memaddr,
        WASM.Arithmetic.add(memaddr, bytesWritten),
      ];

      const neighbour = getNeighbourRange(ranges, range);
      if (neighbour !== undefined) {
        logPossibleDataRace(sourceMap, i, range, neighbour);
      }
      ranges.push(range);
    },
  );
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
  loadSourceMap?: () => Promise<SourceMap>,
): Promise<BenchmarkMeasurement> {
  alreadLogged.clear();
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
  detectDataRace(analysis, sourceMap);
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
