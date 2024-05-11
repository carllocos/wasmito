import { DeviceManager } from '../device/device_manager';
import { BoardBaudRate } from '../util/serial_port';
import { WasmValuesBuilder } from '../webassembly/wasm_value_array_builder';
import { type WasmState } from '../webassembly';
import { type WARDuinoVM } from '../warduino/vm/warduino_vm';
import { type MCUWARDuinoVM } from '../warduino/vm/mcu_vm';
import { StateRequest } from '../warduino/requests/inspect_request';
import { Breakpoint } from '../debugger/breakpoint';
import { TargetLanguage } from '../compilers/prog_language_selection';
import {
  type FactoryArgs,
  createArduinoPlatform,
  type ArduinoBoardBuilder,
} from '../builder';
import { type WATCompilerArgs } from '../source_mappers';

export async function callLedcSetup(vm: WARDuinoVM): Promise<void> {
  const funcLEDCSetup = 5;
  const argsLEDCSetup = new WasmValuesBuilder();
  argsLEDCSetup.addI32Value(0).addI32Value(5000).addI32Value(12);
  const reply = await vm.proxyCall(funcLEDCSetup, argsLEDCSetup.values);
  console.log(reply);
}

export async function callLedCAttachPin(vm: WARDuinoVM): Promise<void> {
  const funcLEDCAttachPin = 6;
  const argsLEDCAttachPin = new WasmValuesBuilder();
  argsLEDCAttachPin.addI32Value(10);
  argsLEDCAttachPin.addI32Value(0);
  const reply = await vm.proxyCall(funcLEDCAttachPin, argsLEDCAttachPin.values);
  console.log(reply);
}

export async function callPinMode(vm: WARDuinoVM): Promise<void> {
  const funcPinMode = 1;
  const argsPinMode = new WasmValuesBuilder();
  argsPinMode.addI32Value(39);
  argsPinMode.addI32Value(5);
  const reply = await vm.proxyCall(funcPinMode, argsPinMode.values);
  console.log(reply);
}

async function setupMCUVM(
  platform: ArduinoBoardBuilder,
  sourceCodeCompilationArgs: any,
  upload: boolean,
): Promise<MCUWARDuinoVM> {
  const dm = new DeviceManager();
  if (upload) {
    return await dm.spawnHardwareVM(platform, sourceCodeCompilationArgs);
  } else {
    throw new Error(`TODO`);
  }
}

export async function testEventHook(
  args: FactoryArgs,
  sourceCodeCompilationArgs: any,
  uploadSourceCode: boolean,
): Promise<void> {
  const platform = await createArduinoPlatform(args);
  const vm = await setupMCUVM(
    platform,
    sourceCodeCompilationArgs,
    uploadSourceCode,
  );
  const bp = new Breakpoint(
    {
      linenr: 88,
    },
    new StateRequest().includePC(),
  );
  bp.subscribe((state: WasmState) => {
    console.log('breakpoint reached');
    // vm.run().then(console.log).catch(console.error);
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
  selectedLanguage: {
    targetLanguage: TargetLanguage.WAT,
  },
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
const sourceCodeCompilationArgs: WATCompilerArgs = {
  sourceCodePath: './src/tool_examples/wat_examples/dimmer-double-button.wat',
};

testEventHook(config, sourceCodeCompilationArgs, updateSourceCode)
  .then(console.log)
  .catch(console.error);
