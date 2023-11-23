import { DeviceMode, type DeviceConfig } from '../../src/device/device_config';
import { DeviceManager } from '../../src/device/device_manager';
import { type EmulatedWARDuinoVM } from '../../src/warduino/vm/emulated_vm';

describe('Resolve Event Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: EmulatedWARDuinoVM | undefined;

  before(async () => {
    const app = './test/data/test-example.wat';
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

  it('Resolve event request on emulator', async () => {
    // TODO vm crashes for resolveEvent and nothing in the queue.
    await vm?.resolveEvent();
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeEmulatorVM(vm);
    }
  });
});
