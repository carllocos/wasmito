import { DeviceManager } from '../../src/device/device_manager';
import { type WasmitoDevVM } from '../../src/runtimes/wasmito_vm/dev_vm';
import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';

describe('Snapshot Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WasmitoDevVM | undefined;

  before(async () => {
    deviceManager = new DeviceManager();
    const platform = await createDevPlatform();
    const program = './test/data/test-example.wasm';
    const langAdaptor = LanguageAdaptor.emptyAdaptor(program);
    vm = await deviceManager.spawnDevelopmentVM(langAdaptor, platform, 5000);
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
