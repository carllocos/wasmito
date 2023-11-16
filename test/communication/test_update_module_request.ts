import { DeviceManager } from '../../src/device/device_manager';
import { DeviceMode, type DeviceConfig } from '../../src/device/device_config';
import { type EmulatedWARDuinoVM } from '../../src/warduino/vm/emulated_vm';

describe('Update Wasm Module Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: EmulatedWARDuinoVM | undefined;
  let app: string = '';

  before(async () => {
    app = process.cwd() + '/test/data/test-example.wasm';
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

  it('Request should resolve on emulator', async () => {
    await vm?.uploadSourceCode(app);
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeEmulatorVM(vm);
    }
  });
});
