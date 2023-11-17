import { DeviceManager } from '../../src/device/device_manager';
import { DeviceMode, type DeviceConfig } from '../../src/device/device_config';
import { type EmulatedWARDuinoVM } from '../../src/warduino/vm/emulated_vm';
import { StateRequest } from '../../src/warduino/requests/inspect_request';

describe('Snapshot Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: EmulatedWARDuinoVM | undefined;

  before(async () => {
    const app = process.cwd() + '/test/data/test-example.wasm';
    deviceManager = new DeviceManager();
    const deviceConfig: DeviceConfig = {
      program: app,
      mode: DeviceMode.Emulate,
      id: '1',
      name: 'emulator',
      host: 'localhost',
      port: '',
    };
    vm = await deviceManager.spawnEmulator(deviceConfig, 3000);
  });

  it('Inspecting pc', async () => {
    const request = new StateRequest();
    request.includePC();
    await vm?.inspect(request);
  });

  it('Inspecting stack', async () => {
    const request = new StateRequest();
    request.includeStack();
    await vm?.inspect(request);
  });

  it('Inspecting Branching Table', async () => {
    const request = new StateRequest();
    request.includeBranchingTable();
    await vm?.inspect(request);
  });

  it('Inspecting breakpoints', async () => {
    const request = new StateRequest();
    request.includeBreakpoints();
    await vm?.inspect(request);
  });

  it('Inspecting CallbackMappings', async () => {
    const request = new StateRequest();
    request.includeCallbackMappings();
    await vm?.inspect(request);
  });

  it('Inspecting callstack', async () => {
    const request = new StateRequest();
    request.includeCallstack();
    await vm?.inspect(request);
  });

  it('Inspecting events', async () => {
    const request = new StateRequest();
    request.includeEvents();
    await vm?.inspect(request);
  });

  it('Inspecting globals', async () => {
    const request = new StateRequest();
    request.includeGlobals();
    await vm?.inspect(request);
  });

  it('Inspecting memory', async () => {
    const request = new StateRequest();
    request.includeMemory();
    await vm?.inspect(request);
  });

  it('Inspecting Table', async () => {
    const request = new StateRequest();
    request.includeTable();
    await vm?.inspect(request);
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeEmulatorVM(vm);
    }
  });
});
