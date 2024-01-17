import { DeviceManager } from '../../src/device/device_manager';
import { type WARDuinoDevVM } from '../../src/warduino/vm/dev_vm';
import { type VMConfigArgs } from '../../src';

describe('Snapshot Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WARDuinoDevVM | undefined;

  before(async () => {
    deviceManager = new DeviceManager();
    const vmConfigArgs: VMConfigArgs = {
      program: './test/data/test-example.wat',
      disableStrictModuleLoad: true,
    };

    vm = await deviceManager.spawnDevelopmentVM(vmConfigArgs, 5000);
  });

  it('Request should resolve on DevVM', async () => {
    await vm?.snapshot();
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeVM(vm);
    }
  });
});
