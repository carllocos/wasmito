import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { DeviceManager } from '../../src/device/device_manager';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { type WATCompilerArgs } from '../../src/compilers/wat_compilers';
import { type WasmitoDevVM } from '../../src/runtimes/vm/dev_vm';

describe('Resolve Event Request', () => {
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
      3000,
    );
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
