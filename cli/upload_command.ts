import { type Command } from 'commander';
import { getProjectDir, isProjectDirPresent } from './project_command';
import { getDeviceConfiguration } from './devices_command';
import { createDirectoryIfUnexisting, pathJoin } from '../src/util/file_util';
import { PlatformTarget } from '../src/platforms/platform_config';
import { ArduinoBoardBuilder } from '../src/platforms/arduino_platform';
import { DevVMPlatform } from '../src/platforms/dev_vm_platform';
import { type DeviceIdentity } from '../src/device/device_config';
import { type WasmCompilerArgs } from '../src/compilers/wasm_compiler';

export function registerUploadCommand(program: Command): void {
  program
    .command('upload')
    .description(`upload a WebAssembly module to a device`)
    .argument(
      '<id-or-name> <wasm-path>',
      'the wasm module <wasm-path> to which device to upload <id-or-name>',
    )
    .action(async (idOrName, wasmPath) => {
      if (!isProjectDirPresent()) {
        program.error(
          `There is no project defined in the current working directory. First create a project see 'help project'`,
        );
        return;
      }

      const dev = await getDeviceConfiguration(idOrName);
      if (Array.isArray(dev)) {
        const errors = dev.join('\n');
        program.error(`could not upload to device '${idOrName}':\n${errors}`);
      }

      const dest = createUploadDeviceDirIfNeeded(dev.deviceIdentity);

      const maxMinutes = 5; // max upload time in min
      const maxWaitTime = maxMinutes * 60 * 1000;
      const platform =
        dev.target === PlatformTarget.Arduino
          ? new ArduinoBoardBuilder(dev, dest)
          : new DevVMPlatform(dev, dest);
      const arg: WasmCompilerArgs = {
        wasmPath,
      };

      const compiled = await platform.compileSourceCode({
        arg,
        maxWaitTime,
      });
      if (compiled !== 0) {
        program.error(`Failed to compile source code`);
      } else {
        // TODO fix upload for DevVM
        await platform.upload();
      }
    });
}

function getUploadDirectory(): string {
  const dir = getProjectDir();
  const uploadDir = 'uploads';
  return pathJoin(dir, uploadDir);
}

function createUploadDeviceDirIfNeeded(id: DeviceIdentity): string {
  const dir = getUploadDirectory();
  const deviceDir = pathJoin(dir, id.id);
  createDirectoryIfUnexisting(deviceDir);
  return deviceDir;
}
