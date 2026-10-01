// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  GlobalGetInstruction,
  GlobalSetInstruction,
  isGlobalGetInstruction,
  isGlobalSetInstruction,
  LoadInstruction,
  StoreInstruction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  WasmInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
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

const logger = createLogger('VariableViolation');

function logGlobalViolation(
  read: GlobalGetInstruction,
  write: GlobalSetInstruction,
): void {
  const key = `${read.index},${write.index}`;
  if (alreadyReported.has(key)) return;
  alreadyReported.add(key);

  let logText = `Global #${read.index}`;
  if (sourceMap !== undefined) {
    const readTxt = sourceMap
      .getOriginalPositionFor(read.startAddress)
      .map(sourceCodeLocationToString)
      .join(', ');
    const writeTxt = sourceMap
      .getOriginalPositionFor(write.startAddress)
      .map(sourceCodeLocationToString)
      .join(', ');
    logText = `${logText}\n\tread at ${readTxt}\n\twritten at ${writeTxt}`;
  } else {
    const readTxt = `address 0x${read.startAddress.toString(16)}`;
    const writeTxt = `address 0x${write.startAddress.toString(16)}`;

    logText = `${logText}\n\tread at ${readTxt}\n\twritten at ${writeTxt}`;
  }

  console.log(`[Variable Violation Detected] ${logText}`);
}

const memoryWritten: [number | bigint, number | bigint][] = [];
const globalsWritten: GlobalSetInstruction[] = [];
const memoryRead: [LoadInstruction, number | bigint, number | bigint][] = [];
const globalsGet: GlobalGetInstruction[] = [];
let sourceMap: SourceMap | undefined;

function registerWrite(
  i: GlobalSetInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
): [number | bigint, number | bigint] {
  if (isGlobalSetInstruction(i)) {
    globalsWritten.push(i);
    return [-1, -1];
  }
  const bytesWritten = i.targetValueSize();
  const memaddr = WASM.Arithmetic.add(i.offset, args[1].value);
  const range: [number | bigint, number | bigint] = [
    memaddr,
    WASM.Arithmetic.add(memaddr, bytesWritten),
  ];
  memoryWritten.push(range);
  return range;
}

const alreadyReported = new Set<string>();

function logMemoryViolation(
  write: StoreInstruction,
  startWrite: number | bigint,
  endWrite: number | bigint,
  read: LoadInstruction,
  startRead: number | bigint,
  endRead: number | bigint,
): void {
  const key = `${startRead},${endRead},${startWrite},${endWrite}`;
  if (alreadyReported.has(key)) return;
  alreadyReported.add(key);

  let writeTxt = `address 0x${write.startAddress.toString(16)}`;
  let readTxt = `address 0x${write.startAddress.toString(16)}`;
  if (sourceMap !== undefined) {
    const t1 = sourceMap
      .getOriginalPositionFor(write.startAddress)
      .map(sourceCodeLocationToString)
      .join(', ');
    writeTxt = `${t1} ${writeTxt}]`;

    const t2 = sourceMap
      .getOriginalPositionFor(read.startAddress)
      .map(sourceCodeLocationToString)
      .join(', ');
    readTxt = `${t2} ${readTxt}`;
  }
  writeTxt = `${writeTxt} range [${startWrite},${endWrite}]`;
  readTxt = `${readTxt} range [${startRead},${endRead}]`;

  console.log(
    `[Single Variable Violation Detected] Write at memory location ${writeTxt} overwrites read location ${readTxt}`,
  );
}

function checkViolation(
  i: GlobalSetInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
): void {
  const [startWrite, endWrite] = registerWrite(i, args);
  if (isGlobalSetInstruction(i)) {
    globalsGet
      .filter((g) => g.index === i.index)
      .forEach((g) => logGlobalViolation(g, i));
    return;
  }
  for (const [readInstr, startRead, endRead] of memoryRead) {
    if (startWrite <= startRead && startRead <= endWrite) {
      logMemoryViolation(
        i,
        startWrite,
        endWrite,
        readInstr,
        startRead,
        endRead,
      );
    }
  }
}

function registerRead(
  i: LoadInstruction | GlobalGetInstruction,
  args: ReadOnlyWasmValue[],
): void {
  if (isGlobalGetInstruction(i)) {
    globalsGet.push(i);
  } else {
    const bytesRead = i.targetValueSize();
    const memaddr = WASM.Arithmetic.add(i.offset, args[0].value);
    memoryRead.push([i, memaddr, WASM.Arithmetic.add(memaddr, bytesRead)]);
  }
}

const handlersRegistered = new Set<number>();

function checkViolationInHandler(
  i: GlobalSetInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
): void {
  if (!handlersRegistered.has(i.getEnclosingFunction().id)) return;
  checkViolation(i, args);
}

function registerAdvices(analysis: WasmAnalysis): void {
  analysis.before(WasmCode.GlobalGet, registerRead);
  analysis.before(WasmCode.MultipleOpcode.Load, registerRead);

  analysis.before(WasmCode.GlobalSet, checkViolationInHandler);
  analysis.before(WasmCode.MultipleOpcode.Store, checkViolationInHandler);
  analysis.onPinInterruptHandlerUpdateMut((handlersInfo, _vm) => {
    handlersInfo
      .flatMap((h) => h.handlers)
      .forEach((f) => handlersRegistered.add(f.id));
  });
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
  loadSourceMap?: () => Promise<SourceMap>,
): Promise<BenchmarkMeasurement> {
  memoryWritten.length = 0;
  globalsWritten.length = 0;
  memoryRead.length = 0;
  globalsGet.length = 0;
  alreadyReported.clear();
  handlersRegistered.clear();

  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  sourceMap = await loadSourceMap?.();
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
  registerAdvices(analysis);
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
