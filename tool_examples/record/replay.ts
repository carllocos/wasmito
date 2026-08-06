import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { exit } from 'process';
import { isRecordInterrupt, logRecord, type Record } from './record_item';
import { loadRecords } from './store_record';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { connectToExistingMCUVM, spawnDevVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BoardBaudRate } from '../../src/util/serial_port';

const records: Record[] = [];
let recordIdx = 0;

async function replay(
  i: WasmInstruction,
  args: WritableWasmValue[],
  vm: WasmitoBackendVM,
): Promise<WritableWasmValue[]> {
  if (recordIdx >= records.length) {
    vm.close();
    exit(0);
  }
  const recordedItem = records[recordIdx++];
  logRecord(recordedItem);

  if (isRecordInterrupt(recordedItem)) {
    await vm.simulateInterrupt(recordedItem.pin);
    return args;
  }

  for (let i = 0; i < args.length; i++) {
    const item = recordedItem.instrArgs[i];
    if (item === undefined) {
      console.log(`failed at idx ${i}`);
    }
    args[i].value = item.value;
  }

  return args;
}

export async function main(wasmPath: string, csvRecord: string): Promise<void> {
  records.push(...loadRecords(csvRecord));
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm);
  // const vmConnection = await connectToExistingMCUVM(wasm, {
  //   vmConfig: {
  //     pauseOnStart: true, // pause the VM on deploy of the Wasm module
  //     // serialPort: '/dev/cu.usbserial-8952FFEE8B',
  //     serialPort: '/dev/cu.usbserial-F551D69EA8',
  //     baudrate: BoardBaudRate.BD_115200,
  //     fqbn: {
  //       boardName: 'M5Stick-C',
  //       fqbn: 'm5stack:esp32:m5stick-c',
  //     },
  //   },
  // });

  const analysis = new WasmAnalysis(wasm, vmConnection);
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      analysis.beforeMut(i, replay);
    }
  }

  const deployInBulk = false;
  await analysis.deploy(deployInBulk);
  await analysis.run();
}
