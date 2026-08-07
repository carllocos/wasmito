import { resolve } from 'path';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  PinInterruptHandler,
  ReadOnlyWasmValue,
} from '../../src/tool_api/interrupts';
import {
  GlobalGetInstruction,
  GlobalSetInstruction,
  LoadInstruction,
  StoreInstruction,
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

async function detectOrderViolation(
  analysis: WasmAnalysis,
  _connection: WasmitoBackendVM,
  sourceMap: SourceMap,
): Promise<void> {
  const initialisedGlobals = new Set<number>(
    analysis.wasm.globals.filter((g) => g.value > 0).map((g) => g.index),
  );
  const reportedErrorsGlobals = new Set<number>();
  analysis.before(
    WasmCode.GlobalGet,
    (i: GlobalGetInstruction, _args: ReadOnlyWasmValue[]) => {
      if (initialisedGlobals.has(i.index)) {
        if (!reportedErrorsGlobals.has(i.index)) {
          reportedErrorsGlobals.add(i.index);
          // console.log(
          //   `Global #${i.index} ${i.immediate} was accessed with initialisation`,
          // );
        }
        return;
      }
      if (!reportedErrorsGlobals.has(i.index)) {
        reportedErrorsGlobals.add(i.index);
        const logText = `Global #${i.index} was accessed without initialisation`;
        const posStr = sourceMap
          .getOriginalPositionFor(i.startAddress)
          .map(sourceCodeLocationToString)
          .join(', ');
        console.log(`[Order Violation Detected] ${posStr} ${logText}`);
      }
    },
  );
  analysis.before(
    WasmCode.GlobalSet,
    (i: GlobalSetInstruction, _args: ReadOnlyWasmValue[]) => {
      initialisedGlobals.add(i.index);
    },
  );

  const initialisedMemory: Array<[number, number]> = [];
  analysis.before(
    WasmCode.MultipleOpcode.Load,
    (i: LoadInstruction, args: ReadOnlyWasmValue[]) => {
      const addr = args[0].value;
      const bytesRead = i.targetValueSize();
      const rangeRead = [i.offset + addr, i.offset + addr + bytesRead];
      console.log(`Loading memory range [${rangeRead[0]},${rangeRead[1]}]`);
      let initialised = false;
      for (const [start, end] of initialisedMemory) {
        if (start <= rangeRead[0] && rangeRead[1] <= end) {
          initialised = true;
          break;
        }
      }
      if (!initialised) {
        console.log(
          `instruction '0x${i.startAddress.toString(16)}: ${i.name}' loads unitiliased memory range [${rangeRead[0]},${rangeRead[1]}]`,
        );
      }
    },
  );
  analysis.before(
    WasmCode.MultipleOpcode.Store,
    (i: StoreInstruction, args: ReadOnlyWasmValue[]) => {
      const bytesWritten = i.targetValueSize();
      const memaddr = i.offset + args[1].value;
      const range: [number, number] = [memaddr, memaddr + bytesWritten];
      console.log(`Storing memory range [${range[0]},${range[1]}]`);
      initialisedMemory.push(range);
    },
  );

  // const readInstrs = analysis.wasm.instructions.filter(
  //   (i) => isLoadInstruction(i) || isGlobalGetInstruction(i),
  // );

  // const writeInstrs = analysis.wasm.instructions.filter(
  //   (i) => isStoreInstruction(i) || isGlobalSetInstruction(i),
  // );

  // const pinsRegistered = new Set<number>();
  // analysis
  //   .onPinInterruptHandlerUpdateMut
  // async (pinHandlers: PinInterruptHandler[], vm: WasmitoBackendVM) => {
  //   debugger;
  //   const instrs = findInstructionsToInject(
  //     pinHandlers,
  //     analysis.wasm,
  //     readInstrs,
  //     writeInstrs,
  //   );
  //   for (const ph of pinHandlers) {
  //     if (pinsRegistered.has(ph.pin)) continue;
  //     const h = new AddEventPinHook(ph.pin);
  //     for (const i of instrs) {
  //       await vm.addHookBefore(instrToSourceCodeLocation(i), h);
  //     }
  //   }
  // },
  // ();

  // simulateInterruptEverySecond(connection, 37, 5);
  await analysis.deploy();
  await analysis.run();
}

function _findInstructionsToInject(
  _handlers: PinInterruptHandler[],
  _wasm: WasmModule,
  _reads: (GlobalGetInstruction | LoadInstruction)[],
  _writes: (GlobalSetInstruction | StoreInstruction)[],
): WasmInstruction[] {
  return [];
}

// function simulateInterruptEverySecond(
//   vm: WasmitoBackendVM,
//   pin: number,
//   nrOfInterrupts: number,
// ): void {
//   if (nrOfInterrupts <= 0) return;

//   const sleepTime = 1000;
//   setTimeout(async () => {
//     await vm.simulateInterrupt(pin);
//     simulateInterruptEverySecond(vm, pin, nrOfInterrupts - 1);
//   }, sleepTime);
// }

async function main(): Promise<void> {
  const wasmPath = resolve(
    './app_examples/assemblyscript/order_violation/wasm/order_violation.wasm',
  );

  const sourceMapPath = resolve(
    './app_examples/assemblyscript/order_violation/wasm/order_violation.wasm.map',
  );
  const sourceMap = await readSourceMap(
    DebugStandard.SourceMapSpec,
    wasmPath,
    sourceMapPath,
    {
      relativePaths: true,
    },
  );

  // const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(sourceMap.wasm);
  const analysis = new WasmAnalysis(sourceMap, vmConnection);
  await detectOrderViolation(analysis, vmConnection, sourceMap);
}

main();
