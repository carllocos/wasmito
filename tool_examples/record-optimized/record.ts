import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  ReadOnlyInterrupt,
  ReadOnlyWasmValue,
} from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { exit } from 'process';
import {
  copyClock,
  LogicalClock,
  logRecordings,
  newLogicalClock,
  type Record,
} from './logical_clock';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';

import { BoardBaudRate } from '../../src/util/serial_port';
import { writeFile, WriteFileOptions } from 'fs';

// import { WriteFileOptions, writeFileSync } from 'node:fs';

function recordInterrupt(interrupt: ReadOnlyInterrupt): void {
  logicalClock.interrupts += 1;
  const record: Record = {
    topic: interrupt.topic,
    payload: interrupt.payload,
    clock: copyClock(logicalClock),
  };
  records.push(record);
  // logRecord(record);
}

function recordInstr(i: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  logicalClock.instrs += 1;

  const record: Record = {
    instrAddr: i.startAddress,
    instrName: i.name,
    instrArgs: args,
    clock: copyClock(logicalClock),
  };
  records.push(record);
  // logRecord(record);
}
function incrementInstrClock(
  i: WasmInstruction,
  args: ReadOnlyWasmValue[],
): void {
  if (args.length > 0) {
    console.log('should be recorded...');
    // recordInstr(i, args);
  }
  logicalClock.instrs += 1;
}

const logicalClock: LogicalClock = newLogicalClock();
const records: Record[] = [];

const writeFlags: WriteFileOptions = {
  encoding: 'utf-8',
  flag: 'a',
  mode: 0o666,
};

async function main(): Promise<void> {
  const wasmPath = resolve('./app_examples/assemblyscript/fib/wasm/fib.wasm');
  /*
  const wasmPath = resolve(
    './libs/WARDuino/benchmarks/tasks/fac/wast/impl.wasm',
  );
  */

  const wasm = new WasmModule(wasmPath);
  //const instr = wasm.getInstruction(0xee);
  //assert(instr !== undefined);
  // uncomment next to run analysis on local VM
  // const vmConnection = await spawnDevVM(wasm);
  // uncomment next to run analysis on MCU VM
  const vmConnection = await spawnMCUVM(wasm, {
    vmConfig: {
      pauseOnStart: true, // pause the VM on deploy of the Wasm module
      serialPort: '/dev/ttyUSB0',
      baudrate: BoardBaudRate.BD_115200,
      fqbn: {
        boardName: 'M5Stick-C',
        fqbn: 'm5stack:esp32:m5stick-c',
      },
    },
  });

  const analysis = new WasmAnalysis(wasm, vmConnection);

  let instrumentedCount = 0;
  let countingCount = 0;
  const exportedFunctions = wasm.allExportedFuncs();
  const exportedFunctionsIds = exportedFunctions.map((value) => value.id);
  // these functions are the ones that may be counted as they dont belong to the exported funcs.

  let recordingFunctions = wasm.functions.filter((outerValue, index, array) => {
    return (
      // find the exported function in the functions array
      exportedFunctionsIds.findIndex(
        (inner, index, array) => inner == outerValue.id,
        // if not found this function may be just counted.
      ) == -1
    );
  });

  // recordingFunctions = wasm.functions;

  for (const f of recordingFunctions) {
    console.log(`amount of instructions: #${f.allInstructions.length}#`);
    for (const i of f.allInstructions) {
      console.log(`    amount of args: #${i.args.length}#`);
      if (i.args.length > 0) {
        console.log(`        R${i.startAddress}`);
        analysis.before(i, recordInstr);

        instrumentedCount += 1;
      } else {
        console.log(`        C${i.startAddress}`);
        analysis.before(i, incrementInstrClock);
        countingCount += 1;
      }
    }
  }
  for (const f of exportedFunctions) {
    for (const i of f.allInstructions) {
      console.log('        R');
      analysis.before(i, recordInstr);
      instrumentedCount += 1;
    }
  }

  console.log(`counting ${countingCount} and recording ${instrumentedCount}`);

  //register advice on before handling interrupt
  analysis.beforeHandlingInterrupt(recordInterrupt);
  await analysis.deploy();
  const recordSecs = 10;
  await analysis.run();
  const beginTime = performance.now();

  const ms = recordSecs * 1000; // convert to milliseconds
  setTimeout(async () => {
    const endTime = performance.now();
    logRecordings(records);
    writeFile(
      resolve('./tool_examples/record-optimized/bench-rec.csv'),
      `${wasmPath},${endTime - beginTime}\n`,
      writeFlags,
      () => console.log('time written'),
    );
    await vmConnection.pause();
    await analysis.remove();
    await vmConnection.close();
    console.log(`recording time: ${(endTime - beginTime) / 1000}s`);
    exit(0);
  }, ms);

  // The following is optional
  // if you comment, no interrupt will be simulated
  // ==> no interrupts has to be recorded yet as I am starting with the blink example
  // simulateInterruptEverySecond(vmConnection, 37, 5);
}

/**
 * stop recoring on the given VM connection `vm` after `recordSecs`
 * @param vm the connection to a local WARDuino VM or VM on a MCU
 * @param analysis The analysis/tool running
 * @param recordSecs the number of seconds to record
 */
function stopRecording(
  vm: WasmitoBackendVM,
  analysis: WasmAnalysis,
  recordSecs: number,
): void {
  const ms = recordSecs * 1000; // convert to milliseconds
  setTimeout(async () => {
    await vm.pause();
    await analysis.remove();
    await vm.close();
    logRecordings(records);
    exit(0);
  }, ms);
  // records;
}

/**
 * Simulates interrupts on pin number `pin` every second for a certain number of times `nrOfInterrupts`
 * onto the VM `vm`
 * @param vm a local or MCU VM connection
 * @param pin the pin number on which the interrupt is generated.
 * @param nrOfInterrupts nr of interrupts to simulate
 * @returns
 */
/*
function simulateInterruptEverySecond(
  vm: WasmitoBackendVM,
  pin: number,
  nrOfInterrupts: number,
): void {
  if (nrOfInterrupts <= 0) return;

  const sleepTime = 1000;
  setTimeout(async () => {
    await vm.simulateInterrupt(pin);
    simulateInterruptEverySecond(vm, pin, nrOfInterrupts - 1);
  }, sleepTime);
}
  */

main().catch(console.error);
