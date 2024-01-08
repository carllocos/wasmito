import { DeviceManager } from '../../src/device/device_manager';
import { type WARDuinoDevVM } from '../../src/warduino/vm/emulated_vm';
import { type VMConfigArgs } from '../../src/device/vm_config';

describe('Update Wasm Module Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WARDuinoDevVM | undefined;
  const vmName = 'DevVM';
  const vmID = '1';
  const app = './test/data/test-example.wat';

  before(async () => {
    deviceManager = new DeviceManager();

    const vmConfigArgs: VMConfigArgs = {
      program: app,
      disableStrictModuleLoad: true,
    };

    vm = await deviceManager.spawnDevelopmentVM(
      vmName,
      vmID,
      vmConfigArgs,
      3000,
    );
  });

  it('Request should resolve on DevVM', async () => {
    await vm?.uploadSourceCode(app);
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeVM(vm);
    }
  });
});
