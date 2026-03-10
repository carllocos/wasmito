import { io } from 'socket.io-client';

import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { BoardBaudRate } from '../../src/util/serial_port';

import { exit, send } from 'process';

// Connection to brigadier server
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
});


async function main(): Promise<void> {
  const analyseMaxTimeSecs = 4; // stop analysis after this many seconds

  const wasmPath = resolve(
    './app_examples/assemblyscript/blink/wasm/blink.wasm',
  );
  const wasm = new WasmModule(wasmPath);

  // Running analysis on the computer 
  // const vmConnection = await spawnDevVM(wasm);

  // Running analysis on the MCU
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

  // Add a call before every instruction
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      // analysis.before(i, showInstruction);
      analysis.before(i, sendToBrigadier);
      console.log(`Function ${f.name} instruction ${i.name} at address ${i.startAddress} is processed`);
    }
  }

  await analysis.deploy();
  await analysis.run();
  stopRecording(vmConnection, analysis, analyseMaxTimeSecs);
}

function showInstruction(i: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  console.log(`Instruction ${i.name} at address ${i.startAddress} is about to execute`);
}

function sendToBrigadier(i: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  socket.emit('wasmInstruction', {
    name: i.name,
    address: i.startAddress,
    args: args.map(arg => arg.value),
  });
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
    exit(0);
  }, ms);
}

main().catch(console.error);