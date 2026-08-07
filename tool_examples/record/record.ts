import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  ReadOnlyInterrupt,
  ReadOnlyWasmValue,
} from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { exit } from 'process';
import { copyClock, LogicalClock, newLogicalClock } from './logical_clock';
import { logRecord, logRecordings, Record } from './record_item';

import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  connectToExistingMCUVM,
  spawnDevVM,
} from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BoardBaudRate } from '../../src/util/serial_port';
import { RecordWriter } from './store_record';
import { WASM } from '../../src/webassembly/wasm';

function recordInterrupt(interrupt: ReadOnlyInterrupt): void {
  logicalClock.interrupts += 1;
  const record: Record = {
    topic: interrupt.topic,
    payload: interrupt.payload,
    pin: WASM.interruptTopicToPinNumber(interrupt.topic),
    clock: copyClock(logicalClock),
  };
  records.push(record);
  recordsWriter?.writeRecord(record);
  logRecord(record);
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
  recordsWriter?.writeRecord(record);
  logRecord(record);
}

const logicalClock: LogicalClock = newLogicalClock();
const records: Record[] = [];
let recordsWriter: RecordWriter | undefined;

export async function main(csvFile: string, wasmPath: string): Promise<void> {
  recordsWriter = new RecordWriter(csvFile);
  const wasm = new WasmModule(wasmPath);
  // uncomment the following to target a MCU
  // const vmConnection = await connectToExistingMCUVM(wasm, {
  //   vmConfig: {
  //     pauseOnStart: true, // pause the VM on deploy of the Wasm module
  //     serialPort: '/dev/cu.usbserial-F551D69EA8',
  //     baudrate: BoardBaudRate.BD_115200,
  //     fqbn: {
  //       boardName: 'M5Stick-C',
  //       fqbn: 'm5stack:esp32:m5stick-c',
  //     },
  //   },
  // });
  const vmConnection = await spawnDevVM(wasm);
  const analysis = new WasmAnalysis(wasm, vmConnection);
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      analysis.before(i, recordInstr);
    }
  }

  analysis.beforeHandlingInterrupt(recordInterrupt);

  const deployInBulk = false;
  await analysis.deploy(deployInBulk);
  const recordSecs = 20;
  stopRecording(vmConnection, analysis, recordSecs);
  // The following is optional
  // if you comment, no interrupt will be simulated
  // simulateInterruptEverySecond(vmConnection, 37, 5);

  await analysis.run();
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
    await recordsWriter?.close();
    logRecordings(records);
    exit(0);
  }, ms);
}

/**
 * Simulates interrupts on pin number `pin` every second for a certain number of times `nrOfInterrupts`
 * onto the VM `vm`
 * @param vm a local or MCU VM connection
 * @param pin the pin number on which the interrupt is generated.
 * @param nrOfInterrupts nr of interrupts to simulate
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function simulateInterruptEverySecond(
  vm: WasmitoBackendVM,
  pin: number,
  nrInterrupts: number,
): void {
  if (nrInterrupts <= 0) return;
  setTimeout(async () => {
    await vm.simulateInterrupt(pin);
    simulateInterruptEverySecond(vm, pin, nrInterrupts - 1);
  }, 1000);
}
