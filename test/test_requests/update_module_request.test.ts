import { DeviceManager } from '../../src/device/device_manager';
import { type WARDuinoDevVM } from '../../src/warduino/vm/dev_vm';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { type WATCompilerArgs } from '../../src/compilers/wat_compilers';
import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';

describe('Update Wasm Module Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WARDuinoDevVM | undefined;
  const sourceCodeCompilerArgs: WATCompilerArgs = {
    sourceCodePath: './test/data/test-example.wat',
  };

  before(async () => {
    deviceManager = new DeviceManager();
    const platform = await createDevPlatform({
      selectedLanguage: {
        targetLanguage: TargetLanguage.WAT,
      },
    });

    vm = await deviceManager.spawnDevelopmentVM(
      platform,
      sourceCodeCompilerArgs,
      5000,
    );
  });

  it('Request should resolve on DevVM', async () => {
    await vm?.uploadSourceCode(sourceCodeCompilerArgs);
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeVM(vm);
    }
  });
});
