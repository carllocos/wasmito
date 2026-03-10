/*
 *  Remote call example
 */
import path, { resolve } from 'path';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert from 'assert';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';

import { BoardBaudRate } from '../../src/util/serial_port';
import { RemoteCallRequest } from '../../src/runtimes/wasmito_vm/requests/fun_call_request';
import { WASM } from '../../src/webassembly/wasm';

async function main(): Promise<void> {
  /*
   * Construct the language adaptor by using the debugging information as json
   * See `tutorial/debugging.md` for more information
   */
  const examplesDir = resolve('./app_examples/assemblyscript/');
  const mappingsPath = path.join(examplesDir, 'toggle_led/wasm/mappings.json');
  const wasmPath = path.join(examplesDir, 'toggle_led/wasm/toggle_led.wasm');
  const langAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
    // give the absolute path to the wasmModule
    newWasmPath: wasmPath,
    // allows relative paths in the debugging information
    // needed to ensure that all the CFG nodes are cosntructed
    relativePaths: true,
  });

  /*
   * Access the main function of the blink.rs
   * To then access the CFG of the main function.
   */
  const mainFunc = langAdaptor.sourceMap.wasm.getMainFunction();
  assert(langAdaptor.sourceCFG !== undefined, 'No CFGs were constructed');
  const cfgMain = langAdaptor.sourceCFG.getFunctionSourceCFG(mainFunc.id);
  assert(cfgMain !== undefined, 'no CFG found for the main function');

  // Spawn a development VM to run analysis on desktop
  // const vmConnection = await spawnDevVM(langAdaptor);
  // uncomment to run analysis on VM deployed on MCU
  const vmConnection = await spawnMCUVM(langAdaptor, {
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
  const funcSetupHardware = 13;
  const remoteCallSetupHard = new RemoteCallRequest(funcSetupHardware, []);
  const result1 = await vmConnection.sendRequest(remoteCallSetupHard);
  console.log(`result ${JSON.stringify(result1)}`);

  const functToggleLed = 7; //call toggleLed() that takes 5 args
  const args: WASM.Value[] = [
    { type: WASM.Type.i32, value: 0 },
    { type: WASM.Type.i32, value: 0 },
    { type: WASM.Type.i32, value: 0 },
    { type: WASM.Type.i32, value: 0 },
    { type: WASM.Type.i32, value: 0 },
  ];
  // function toggleLed(topic_start: u32,topic_len: u32,mem_start: u32,payload_len: u32,payload_len2: u32,
  const remoteCall = new RemoteCallRequest(functToggleLed, args);
  const result = await vmConnection.sendRequest(remoteCall);
  console.log(`result ${JSON.stringify(result)}`);
}

main().catch(console.error);
