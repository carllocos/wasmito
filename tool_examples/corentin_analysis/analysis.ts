import { io } from 'socket.io-client';


import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { connectToExistingMCUVM, spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { CallInstruction, WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { BoardBaudRate } from '../../src/util/serial_port';

import { exit, send } from 'process';
import { createLogger } from '../../src/logger/logger';

const logger = createLogger('SourceCodeWatcher');

// Connection to brigadier server
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  logger.info('Connected to server');
});

// Primitives inside the module being analysed
const primitiveMap = new Map<number, string>();


async function main(): Promise<void> {
  const analyseMaxTimeSecs = 5; // stop analysis after this many seconds

  const wasmPath = resolve(
    './app_examples/assemblyscript/blink/wasm/blink.wasm',
  );
  const wasm = new WasmModule(wasmPath);

  // Running analysis on the computer 
  const vmConnection = await spawnDevVM(wasm);

  // Running analysis on the MCU
  // const vmConnection = await spawnMCUVM(wasm, {
  //   vmConfig: {
  //     pauseOnStart: true, // pause the VM on deploy of the Wasm module
  //     serialPort: '/dev/ttyUSB0',
  //     baudrate: BoardBaudRate.BD_115200,
  //     fqbn: {
  //       boardName: 'M5Stick-C',
  //       fqbn: 'm5stack:esp32:m5stick-c',
  //     },
  //   },
  // });

  // const vmConnection = await connectToExistingMCUVM(wasm, {
  //   vmConfig: {
  //     pauseOnStart: true, // pause the VM on deploy of the Wasm module
  //     serialPort: '/dev/ttyUSB0',
  //     baudrate: BoardBaudRate.BD_115200,
  //     fqbn: {
  //       boardName: 'M5Stick-C',
  //       fqbn: 'm5stack:esp32:m5stick-c',
  //     },
  //   },
  // });


  logger.info('VM connected on MCU');

  const analysis = new WasmAnalysis(wasm, vmConnection);

  // Get all imported functions (happens to be exclusively primitive functions) and create a map from their function index to their name 
  for (const importedFn of wasm.importFuncs) {
    primitiveMap.set(importedFn.id, importedFn.name);
  }

  // Add a callback before every instruction
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      // analysis.before(i, showInstruction);
      analysis.before(i, sendToBrigadier(f));
    }
  }

  await analysis.deploy();
  await analysis.run();
  stopRecording(vmConnection, analysis, analyseMaxTimeSecs);
}

function showInstruction(i: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  logger.info(`Instruction ${i.name} at address ${i.startAddress} is about to execute`);
}

function sendCallInstructionToBrigadier(f: WASMFunction, i: CallInstruction, args: ReadOnlyWasmValue[]): void {
  const callee_id = i.funIdx;
  if (primitiveMap.has(callee_id)) {
    const primitiveName = primitiveMap.get(callee_id);
    socket.emit('wasmPrimitiveCall', {
      name: i.name,
      args: args.map(arg => arg.value),
      function_name: f.name,
      function_address: f.startAddress,
      primitiveFunction: primitiveName
    });
  } else {
    socket.emit('wasmInstruction', {
      name: i.name,
      address: i.startAddress,
      args: args.map(arg => arg.value),
      function_name: f.name,
      function_address: f.startAddress
    });
  }
}

function sendInstructionToBrigadier(f: WASMFunction, i: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  socket.emit('wasmInstruction', {
    name: i.name,
    address: i.startAddress,
    args: args.map(arg => arg.value),
    function_name: f.name,
    function_address: f.startAddress
  });
};



function sendToBrigadier(f: WASMFunction): (i: WasmInstruction, args: ReadOnlyWasmValue[]) => void {
  return (i: WasmInstruction, args: ReadOnlyWasmValue[]) => {
    if (i instanceof CallInstruction) {
      sendCallInstructionToBrigadier(f, i, args);
    } else {
      sendInstructionToBrigadier(f, i, args);
    }
  };
}

function structureForBrigadier(f: WASMFunction, i: WasmInstruction) {
  const name = i.name;
  const address = i.startAddress;
  const args = i.args;
  const f_name = f.name;

  const event = {
    type: name,
    args: args,
    function: f_name
  };
  return event;
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