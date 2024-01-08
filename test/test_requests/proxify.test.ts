import { DeviceManager } from '../../src/device/device_manager';
import { type VMConfigArgs } from '../../src/device/vm_config';
import { type WARDuinoDevVM } from '../../src/warduino/vm/dev_vm';

describe('Proxify Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WARDuinoDevVM | undefined;

  before(async () => {
    deviceManager = new DeviceManager();
    const vmName = 'DevVM';
    const vmID = '1';
    const vmConfigArgs: VMConfigArgs = {
      program: './test/data/test-example.wat',
      disableStrictModuleLoad: true,
    };

    vm = await deviceManager.spawnDevelopmentVM(
      vmName,
      vmID,
      vmConfigArgs,
      3000,
    );
  });

  it('Proxify request resolves on DevVM', async () => {
    await vm?.proxify(20);
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeVM(vm);
    }
  });
});
