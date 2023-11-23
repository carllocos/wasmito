import { DeviceManager } from '../../src/device/device_manager';
import { DeviceMode, type DeviceConfig } from '../../src/device/device_config';
import { type EmulatedWARDuinoVM } from '../../src/warduino/vm/emulated_vm';

describe('Proxify Request', () => {
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

  it('Proxify request resolves on emulator', async () => {
    await vm?.proxify(20);
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeEmulatorVM(vm);
    }
  });
});
