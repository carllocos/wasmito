import { resolve } from 'path';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  GlobalGetInstruction,
  GlobalSetInstruction,
  isGlobalGetInstruction,
  isGlobalSetInstruction,
  isLoadInstruction,
  isStoreInstruction,
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
  DebugStandard,
  readSourceMap,
} from '../../src/source_mappers/source_map_builder';
import {
  sourceCodeLocationToString,
  SourceMap,
} from '../../src/source_mappers/source_map';
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';

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

function globalWrites(
  f: WASMFunction,
): (GlobalSetInstruction | StoreInstruction)[] {
  const instrs = f.instructionsFromOpcode(WasmCode.GlobalSet);
  WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Store)
    .flatMap((opcode) => f.instructionsFromOpcode(opcode))
    .forEach((i) => instrs.push(i));
  // filter is only needed to satisfy type system
  return instrs.filter(
    (i) => isStoreInstruction(i) || isGlobalSetInstruction(i),
  );
}

function _globalReads(
  f: WASMFunction,
): (GlobalGetInstruction | LoadInstruction)[] {
  const instrs = f.instructionsFromOpcode(WasmCode.GlobalGet);
  WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Load)
    .flatMap((opcode) => f.instructionsFromOpcode(opcode))
    .forEach((i) => instrs.push(i));
  // filter is only needed to satisfy type system
  return instrs.filter(
    (i) => isLoadInstruction(i) || isGlobalGetInstruction(i),
  );
}

// type WriteInstruction = GlobalSetInstruction | StoreInstruction;
const memoryWritten: [number, number][] = [];
const globalsWritten: GlobalSetInstruction[] = [];
const memoryRead: [LoadInstruction, number, number][] = [];
const globalsGet: GlobalGetInstruction[] = [];
let sourceMap: SourceMap | undefined;

function registerWrite(
  i: GlobalSetInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
): [number, number] {
  if (isGlobalSetInstruction(i)) {
    globalsWritten.push(i);
    return [-1, -1];
  }
  const bytesWritten = i.targetValueSize();
  const memaddr = i.offset + args[1].value;
  const range: [number, number] = [memaddr, memaddr + bytesWritten];
  memoryWritten.push(range);
  return range;
}

const alreadyReported = new Set<string>();

function logMemoryViolation(
  write: StoreInstruction,
  startWrite: number,
  endWrite: number,
  read: LoadInstruction,
  startRead: number,
  endRead: number,
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
    const memaddr = i.offset + args[0].value;
    memoryRead.push([i, memaddr, memaddr + bytesRead]);
  }
}

async function detectViarableViolation(analysis: WasmAnalysis): Promise<void> {
  analysis.before(WasmCode.GlobalGet, registerRead);
  analysis.before(WasmCode.MultipleOpcode.Load, registerRead);

  const handlersRegistered = new Set<number>();
  analysis.onPinInterruptHandlerUpdateMut(async (handlersInfo, _vm) => {
    handlersInfo
      .flatMap((h) => h.handlers)
      .filter((f) => !handlersRegistered.has(f.id))
      .forEach(async (f) => {
        // for (const instr of globalReads(f))
        //   console.log(
        //     `TODO remove read instructions of func #${f.id} at addr ${instr.startAddress}`,
        //   );

        for (const instr of globalWrites(f))
          analysis.before(instr, checkViolation);

        handlersRegistered.add(f.id);
      });
    await analysis.deploy();
  });

  await analysis.deploy();
  await analysis.run();
}

async function main(): Promise<void> {
  const wasmName = 'single_variable/wasm/single_variable.wasm';
  // const wasmName = 'single_variable/wasm/single_variable_fix.wasm';
  // const wasmName = 'multi_variable/wasm/multi_variable.wasm';
  // const wasmName = 'multi_variable/wasm/multi_variable_fix.wasm';

  const wasmPath = resolve(`./app_examples/assemblyscript/${wasmName}`);
  const sourceMapPath = resolve(
    `./app_examples/assemblyscript/${wasmName}.map`,
  );

  sourceMap = await readSourceMap(
    DebugStandard.SourceMapSpec,
    wasmPath,
    sourceMapPath,
    {
      relativePaths: true,
      columnOffset: 1,
    },
  );

  const vmConnection = await spawnDevVM(sourceMap.wasm);
  const analysis = new WasmAnalysis(sourceMap, vmConnection);
  await detectViarableViolation(analysis);
}

main();
