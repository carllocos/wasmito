import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { DeviceManager } from '../../src/device/device_manager';
import { type WasmitoDevVM } from '../../src/runtimes/wasmito_vm/dev_vm';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';

describe('Resolve Event Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WasmitoDevVM | undefined;

  before(async () => {
    deviceManager = new DeviceManager();
    const program = './test/data/wat/dimmer/dimmer.wasm';
    const platform = await createDevPlatform();
    const langAdaptor = LanguageAdaptor.emptyAdaptor(program);
    vm = await deviceManager.spawnDevelopmentVM(langAdaptor, platform, 3000);
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
