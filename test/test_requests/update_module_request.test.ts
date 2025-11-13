import { DeviceManager } from '../../src/device/device_manager';
import { type WasmitoDevVM } from '../../src/runtimes/wasmito_vm/dev_vm';
import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';

describe('Update Wasm Module Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WasmitoDevVM | undefined;
  let langAdaptor: LanguageAdaptor;

  before(async () => {
    deviceManager = new DeviceManager();
    const platform = await createDevPlatform();
    const program = './test/data/test-example.wasm';
    langAdaptor = LanguageAdaptor.emptyAdaptor(program);
    vm = await deviceManager.spawnDevelopmentVM(langAdaptor, platform, 3000);
  });

  it('Request should resolve on DevVM', async () => {
    await vm?.uploadSourceCode(langAdaptor);
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeVM(vm);
    }
  });
});
