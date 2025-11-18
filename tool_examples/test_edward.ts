import { DeviceManager } from '../src/device/device_manager';
import { BoardBaudRate } from '../src/util/serial_port';
import { WasmValuesBuilder } from '../src/webassembly/wasm_value_array_builder';
import { type WasmState } from '../src/webassembly';
import { type WasmitoBackendVM } from '../src/runtimes/wasmito_vm/wasmito_vm';
import { type MCUWasmitoVM } from '../src/runtimes/wasmito_vm/mcu_vm';
import { StateRequest } from '../src/runtimes/wasmito_vm/requests/inspect_request';
import { Breakpoint } from '../src/debugger/breakpoint';
import {
  type FactoryArgs,
  createArduinoPlatform,
  type ArduinoBoardBuilder,
} from '../src/platforms';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import { resolve } from 'path';

export async function callLedcSetup(vm: WasmitoBackendVM): Promise<void> {
  const funcLEDCSetup = 5;
  const argsLEDCSetup = new WasmValuesBuilder();
  argsLEDCSetup.addI32Value(0).addI32Value(5000).addI32Value(12);
  const reply = await vm.proxyCall(funcLEDCSetup, argsLEDCSetup.values);
  console.log(reply);
}

export async function callLedCAttachPin(vm: WasmitoBackendVM): Promise<void> {
  const funcLEDCAttachPin = 6;
  const argsLEDCAttachPin = new WasmValuesBuilder();
  argsLEDCAttachPin.addI32Value(10);
  argsLEDCAttachPin.addI32Value(0);
  const reply = await vm.proxyCall(funcLEDCAttachPin, argsLEDCAttachPin.values);
  console.log(reply);
}

export async function callPinMode(vm: WasmitoBackendVM): Promise<void> {
  const funcPinMode = 1;
  const argsPinMode = new WasmValuesBuilder();
  argsPinMode.addI32Value(39);
  argsPinMode.addI32Value(5);
  const reply = await vm.proxyCall(funcPinMode, argsPinMode.values);
  console.log(reply);
}

async function setupMCUVM(
  platform: ArduinoBoardBuilder,
  la: LanguageAdaptor,
  upload: boolean,
): Promise<MCUWasmitoVM> {
  const dm = new DeviceManager();
  if (upload) {
    return await dm.spawnHardwareVM(la, platform);
  } else {
    throw new Error(`TODO`);
  }
}

export async function testEventHook(
  args: FactoryArgs,
  la: LanguageAdaptor,
  uploadSourceCode: boolean,
): Promise<void> {
  const platform = await createArduinoPlatform(args);
  const vm = await setupMCUVM(platform, la, uploadSourceCode);
  const bp = new Breakpoint(
    { source: '', linenr: 88, colnr: 0, name: '', address: 0 },
    new StateRequest().includePC(),
  );
  bp.subscribe((_state: WasmState) => {
    console.log('breakpoint reached');
  });
  const added = await vm.addBreakpoint(bp);
  if (!added) {
    return;
  }
  await vm.run();
  // await callSubscribe(vm);
  console.log('here');
}

const updateSourceCode = true;
const config: FactoryArgs = {
  vmConfig: {
    fqbn: {
      fqbn: 'esp32:esp32:m5stick-c',
      boardName: '',
    },
    baudrate: BoardBaudRate.BD_115200,
    serialPort: '/dev/cu.usbserial-8952FFEE8B',
    // serialPort: '/dev/ttyUSB0',
  },
};

const appDir = resolve('./app_examples/wat/dimmer/');
const wasmPath = resolve(appDir, 'dimmer.wasm');
const languageAdaptor = LanguageAdaptor.emptyAdaptor(wasmPath);
testEventHook(config, languageAdaptor, updateSourceCode)
  .then(console.log)
  .catch(console.error);
