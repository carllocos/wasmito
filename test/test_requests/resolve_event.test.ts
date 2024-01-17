import { DeviceManager } from '../../src/device/device_manager';
import { type VMConfigArgs } from '../../src/device/vm_config';
import { type WARDuinoDevVM } from '../../src/warduino/vm/dev_vm';

describe('Resolve Event Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WARDuinoDevVM | undefined;

  before(async () => {
    deviceManager = new DeviceManager();
    const vmConfigArgs: VMConfigArgs = {
      program: './test/data/test-example.wat',
      disableStrictModuleLoad: true,
    };

    vm = await deviceManager.spawnDevelopmentVM(vmConfigArgs, 3000);
  });

  it('Resolve event request on DevVM', async () => {
    // TODO vm crashes for resolveEvent and nothing in the queue.
    await vm?.resolveEvent();
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeVM(vm);
    }
  });
});
