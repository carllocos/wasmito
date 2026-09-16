import { resolve } from 'path';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { StoreInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { connectToExistingMCUVM, spawnDevVM, spawnMCUVM } from '../spawn_vm';
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
import { WASM } from '../../src/webassembly/wasm';
import { readFileSync, writeFileSync } from 'fs';
import { Module } from 'wasmito-tools';
import {
  createTempDirectory,
  getAbsolutePath,
  getFileName,
  pathJoin,
} from '../../src/util/file_util';

type WasmNumber = number | bigint;
type MemRange = [WasmNumber, WasmNumber];

const alreadLogged = new Set<string>();

function logPossibleDataRace(
  sourceMap: SourceMap,
  i: StoreInstruction,
  range1: MemRange,
  range2: MemRange,
): void {
  const r1 = range1[0] < range2[0] ? range1 : range2;
  const r2 = range1[0] > range2[0] ? range1 : range2;
  const logText = `instruction '0x${i.startAddress.toString(16)}: ${i.name}' causes possible data range in memory ranges [${r1[0]},${r1[1]}] and [${r2[0]},${r2[1]}]`;

  const posStr = sourceMap
    .getOriginalPositionFor(i.startAddress)
    .map(sourceCodeLocationToString)
    .join(', ');
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

function detectDataRace(analysis: WasmAnalysis, sourceMap: SourceMap): void {
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

async function main(watPath: string): Promise<void> {
  const wat = readFileSync(watPath, 'utf-8');
  const wasm = Module.from_wat(watPath, wat);
  const outputDirectory = getAbsolutePath(
    createTempDirectory('dataRaceWasmito'),
  );
  const wasmPath = pathJoin(outputDirectory, 'target_module.wasm');
  writeFileSync(wasmPath, wasm.bytes);
  const sourceMap = await readSourceMap(
    DebugStandard.DWARF,
    wasmPath,
    wasmPath,
    {
      relativePaths: true,
    },
  );

  //   const vmConnection = await connectToExistingMCUVM(sourceMap.wasm, {
  //     vmConfig: {
  //       pauseOnStart: true, // pause the VM on deploy of the Wasm module
  //       serialPort: '/dev/cu.usbserial-8952FFEE8B',
  //       baudrate: BoardBaudRate.BD_115200,
  //       fqbn: {
  //         boardName: 'M5Stick-C',
  //         fqbn: 'm5stack:esp32:m5stick-c',
  //       },
  //     },
  //   });
  const vmConnection = await spawnDevVM(sourceMap.wasm);
  const analysis = new WasmAnalysis(sourceMap.wasm, vmConnection);
  detectDataRace(analysis, sourceMap);
  await analysis.deploy();
  await analysis.run();
}

main(resolve(`./test/data/wat/race_temp/race_temp.wat`));
