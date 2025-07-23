import { DeviceManager } from '../../src/device/device_manager';
import { type WasmitoDevVM } from '../../src/runtimes/vm/dev_vm';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { type WATCompilerArgs } from '../../src/compilers/wat_compilers';

describe('Snapshot Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WasmitoDevVM | undefined;

  before(async () => {
    deviceManager = new DeviceManager();
    const program = './test/data/test-example.wat';
    const platform = await createDevPlatform({
      selectedLanguage: {
        targetLanguage: TargetLanguage.WAT,
      },
    });
    const compilationArgs: WATCompilerArgs = {
      sourceCodePath: program,
    };
    vm = await deviceManager.spawnDevelopmentVM(
      platform,
      compilationArgs,
      5000,
    );
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
