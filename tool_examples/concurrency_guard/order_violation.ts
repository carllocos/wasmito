import { resolve } from 'path';
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

import { BoardBaudRate } from '../../src/util/serial_port';
import {
  DebugStandard,
  readSourceMap,
} from '../../src/source_mappers/source_map_builder';
import {
  sourceCodeLocationToString,
  SourceMap,
} from '../../src/source_mappers/source_map';

const reportedErrorsGlobals = new Set<number>();
function logOrderViolation(
  sourceMap: SourceMap,
  i: GlobalGetInstruction | LoadInstruction,
  rangeRead: number[] = [],
): void {
  let logText = '';
  if (isGlobalGetInstruction(i)) {
    if (reportedErrorsGlobals.has(i.index)) return;

    logText = `Global #${i.index} was accessed without initialisation`;
    reportedErrorsGlobals.add(i.index);
  } else {
    logText = `instruction '0x${i.startAddress.toString(16)}: ${i.name}' reads unitiliased memory range [${rangeRead[0]},${rangeRead[1]}]`;
  }

  const posStr = sourceMap
    .getOriginalPositionFor(i.startAddress)
    .map(sourceCodeLocationToString)
    .join(', ');
  console.log(`[Order Violation Detected] ${logText} at ${posStr}`);
}

function isRangeInitialised(
  range: number[],
  initialisedMemory: Array<[number, number]>,
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
  sourceMap: SourceMap,
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

  const initialisedMemory: Array<[number, number]> = [];
  analysis.before(
    WasmCode.MultipleOpcode.Store,
    (i: StoreInstruction, args: ReadOnlyWasmValue[]) => {
      const bytesWritten = i.targetValueSize();
      const memaddr = i.offset + args[1].value;
      const range: [number, number] = [memaddr, memaddr + bytesWritten];
      initialisedMemory.push(range);
    },
  );

  analysis.before(
    WasmCode.MultipleOpcode.Load,
    (i: LoadInstruction, args: ReadOnlyWasmValue[]) => {
      const addr = i.offset + args[0].value;
      const bytesRead = i.targetValueSize();
      const rangeRead = [addr, addr + bytesRead];
      const initialised = isRangeInitialised(rangeRead, initialisedMemory);
      if (!initialised) logOrderViolation(sourceMap, i, rangeRead);
    },
  );
}

async function main(wasmPath: string, sourceMapPath: string): Promise<void> {
  const sourceMap = await readSourceMap(
    DebugStandard.SourceMapSpec,
    wasmPath,
    sourceMapPath,
    {
      relativePaths: true,
      columnOffset: 1,
    },
  );

  const vmConnection = await connectToExistingMCUVM(sourceMap.wasm, {
    vmConfig: {
      pauseOnStart: true, // pause the VM on deploy of the Wasm module
      serialPort: '/dev/cu.usbserial-8952FFEE8B',
      baudrate: BoardBaudRate.BD_115200,
      fqbn: {
        boardName: 'M5Stick-C',
        fqbn: 'm5stack:esp32:m5stick-c',
      },
    },
  });
  const analysis = new WasmAnalysis(sourceMap.wasm, vmConnection);
  detectOrderViolation(analysis, sourceMap);
  await analysis.deploy();
  await analysis.run();
}

main(
  resolve(
    `./app_examples/assemblyscript/toggle_led_bug/wasm/order_violation.wasm`,
  ),
  resolve(
    `./app_examples/assemblyscript/toggle_led_bug/wasm/order_violation.wasm.map`,
  ),
);
