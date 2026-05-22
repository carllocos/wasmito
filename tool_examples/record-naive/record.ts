import { resolve } from 'path';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
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

const writeFlags: WriteFileOptions = {
  encoding: 'utf-8',
  flag: 'a',
  mode: 0o666,
};

let instrumentedCount = 0;
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

const logicalClock: LogicalClock = newLogicalClock();
const records: Record[] = [];

async function main(): Promise<void> {
  const wasmPath = resolve('./app_examples/assemblyscript/fib/wasm/fib.wasm');
  /*
  const wasmPath = resolve(
    './libs/WARDuino/benchmarks/tasks/catalan/wast/impl.wasm',
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
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      // register advice just before executing Wasm instruction i
      analysis.before(i, recordInstr);
      instrumentedCount += 1;
    }
  }
  console.log(`instrumented instructions: #${instrumentedCount}`);

  //register advice on before handling interrupt
  analysis.beforeHandlingInterrupt(recordInterrupt);

  await analysis.deploy();
  const recordSecs = 10;
  const ms = recordSecs * 1000; // convert to milliseconds
  await analysis.run();
  const beginTime = performance.now();
  setTimeout(async () => {
    const endTime = performance.now();
    writeFile(
      resolve('./tool_examples/record-naive/bench-rec.csv'),
      `${wasmPath},${endTime - beginTime}\n`,
      writeFlags,
      () => console.log('time written'),
    );
    await vmConnection.pause();
    await analysis.remove();
    await vmConnection.close();
    logRecordings(records);
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
