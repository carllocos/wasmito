import {
  type BoardFQBN,
  Platform,
  PlatformBuilderConfig,
} from '../builder/platform_config';
import { DeviceManager } from '../device/device_manager';
import { DeploymentMode, type DeviceConfigArgs } from '../device/device_config';
import { BoardBaudRate } from '../util/serial_port';
import { type VMConfigArgs } from '../device/vm_config';
import { WasmValuesBuilder } from '../state/wasm_value_array_builder';
import { type WasmState } from '../state';
import { type WARDuinoVM } from '../warduino/vm/warduino_vm';
import { type MCUWARDuinoVM } from '../warduino/vm/mcu_vm';
import { StateRequest } from '../warduino/requests/inspect_request';

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

async function callSubscribe(vm: WARDuinoVM, args?: number[]): Promise<void> {
  const funcSub = 4;
  const argsSub = new WasmValuesBuilder();
  if (args === undefined) {
    argsSub.addI32Value(39);
    argsSub.addI32Value(1);
    argsSub.addI32Value(2);
  } else if (args.length !== 3) {
    throw new Error('expected 3 args');
  } else {
    argsSub.addI32Value(args[0]);
    argsSub.addI32Value(args[1]);
    argsSub.addI32Value(args[2]);
  }

  const replySub = await vm.proxyCall(funcSub, argsSub.values);
  console.log(replySub);
}

export async function runTest(
  config: PlatformBuilderConfig,
  upload: boolean,
): Promise<void> {
  const dm = new DeviceManager();
  const targetVM = await dm.spawnHardwareVM(config);
  if (upload) {
    const uploaded = await targetVM.uploadSourceCode(vmConfigArgs.program);
    if (!uploaded) {
      throw new Error(`failed to upload source code ${vmConfigArgs.program}`);
    }
  } else {
    const connected = await targetVM.connect();
    if (!connected) {
      throw new Error(`failed to connect`);
    }
  }

  const proxied = await dm.spawnOutOfPlaceVM(targetVM);
  const running = await proxied.run();
  console.log(running);
}

export async function runTestProxyTests(
  config: PlatformBuilderConfig,
  upload: boolean,
): Promise<void> {
  const dm = new DeviceManager();
  const targetVM = await dm.spawnHardwareVM(config);
  if (upload) {
    const uploaded = await targetVM.uploadSourceCode(vmConfigArgs.program);
    if (!uploaded) {
      throw new Error(`failed to upload source code ${vmConfigArgs.program}`);
    }
  } else {
    const connected = await targetVM.connect();
    if (!connected) {
      throw new Error(`failed to connect`);
    }
  }
  await callSubscribe(targetVM);

  console.log('here');
}

export async function runTestProxyOnDev(
  config: PlatformBuilderConfig,
  upload: boolean,
): Promise<void> {
  const dm = new DeviceManager();
  const targetVM = await dm.connectToExistingDevVM(
    {
      deploymentMode: DeploymentMode.DevVM,
    },
    8000,
    config.deviceConfig.vmConfig.program,
    5000,
  );
  await callSubscribe(targetVM);
}

async function setupMCUVM(
  config: PlatformBuilderConfig,
  upload: boolean,
): Promise<MCUWARDuinoVM> {
  const dm = new DeviceManager();
  const targetVM = await dm.spawnHardwareVM(config);
  if (upload) {
    const uploaded = await targetVM.uploadSourceCode(vmConfigArgs.program);
    if (!uploaded) {
      throw new Error(`failed to upload source code ${vmConfigArgs.program}`);
    }
  } else {
    await targetVM.platform.compile(vmConfigArgs.program);
    const connected = await targetVM.connect();
    if (!connected) {
      throw new Error(`failed to connect`);
    }
  }

  return targetVM;
}

export async function testEventHook(
  config: PlatformBuilderConfig,
  upload: boolean,
): Promise<void> {
  const vm = await setupMCUVM(config, upload);
  const added = await vm.addBreakpoint(
    {
      linenr: 88,
    },
    new StateRequest().includePC(),
    (state: WasmState) => {
      console.log('breakpoint reached');
      // vm.run().then(console.log).catch(console.error);
    },
  );
  if (!added) {
    return;
  }
  await vm.run();
  // await callSubscribe(vm);
  console.log('here');
}

const vmConfigArgs: VMConfigArgs = {
  program: './src/tool_examples/wat_examples/dimmer-double-button.wat',
  serialPort: '/dev/ttyUSB0',
};

const deviceConfigArgs: DeviceConfigArgs = {
  name: 'M5stickC',
  deploymentMode: DeploymentMode.MCUVM,
};
const boardFQN: BoardFQBN = {
  fqbn: 'esp32:esp32:m5stick-c',
  boardName: deviceConfigArgs.name as string,
};
const config = new PlatformBuilderConfig(
  Platform.Arduino,
  BoardBaudRate.BD_115200,
  boardFQN,
  deviceConfigArgs,
  vmConfigArgs,
);

const updateSourceCode = true;

testEventHook(config, updateSourceCode).then(console.log).catch(console.error);
