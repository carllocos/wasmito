import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { DeviceManager } from '../../src/device/device_manager';
import { type WasmitoDevVM } from '../../src/runtimes/wasmito_vm/dev_vm';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';

describe('Proxify Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WasmitoDevVM | undefined;

  before(async () => {
    deviceManager = new DeviceManager();
    const program = './test/data/wat/dimmer/dimmer.wasm';
    const platform = await createDevPlatform();
    const langAdaptor = LanguageAdaptor.emptyAdaptor(program);
    vm = await deviceManager.spawnDevelopmentVM(langAdaptor, platform, 3000);
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
