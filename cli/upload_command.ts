import { InvalidArgumentError, Option, type Command } from 'commander';
import { getProjectDir, isProjectDirPresent } from './project_command';
import { getDeviceConfiguration } from './devices_command';
import {
  createDirectoryIfUnexisting,
  isAbsolutePath,
  isFilePath,
  pathJoin,
} from '../src/util/file_util';
import { PlatformTarget } from '../src/platforms/platform_config';
import { ArduinoBoardBuilder } from '../src/platforms/arduino_platform';
import { DevVMPlatform } from '../src/platforms/dev_vm_platform';
import { type DeviceIdentity } from '../src/device/device_config';
import { TargetLanguage } from '../src/compilers/prog_language_selection';
import { type VMConfigArgs } from '../src/device/vm_config';
import { resolve } from 'path';

function validateIdOrName(idOrName: any, _prev: any): string {
  if (typeof idOrName !== 'string') {
    throw new InvalidArgumentError('Not a string');
  }
  return idOrName;
}

function isValidWasmPath(wasmPath: any, _prev: any): string {
  if (typeof wasmPath !== 'string') {
    throw new InvalidArgumentError('Is not a string');
  }

  const path = isAbsolutePath(wasmPath) ? wasmPath : resolve(wasmPath);
  if (!isFilePath(path)) {
    throw new InvalidArgumentError('Is not a Wasm module file path');
  }
  return path;
}

export function registerUploadCommand(program: Command): void {
  program
    .command('upload')
    .description(`upload a WebAssembly module to a device.`)
    .argument(
      '<id-or-name>',
      'the id or name of the device in the project to which the action applies',
      validateIdOrName,
    )
    .option(
      '--wasm <wasm-path>',
      'the wasm module <wasm-path> to which device to upload <id-or-name>',
      isValidWasmPath,
    )
    .option(
      '--pause-on-start',
      'After uploading the Wasm module pause the execution',
    )
    .addOption(
      new Option(
        '--experimental-mode [on-or-off]',
        'Will upload the VM in a way that it allows for experimentation with hooks.',
      )
        .choices(['on', 'off'])
        .default('on'),
    )
    .action(async (idOrName, options) => {
      if (!isProjectDirPresent()) {
        program.error(
          `There is no project defined in the current working directory. First create a project see 'help project'`,
        );
        return;
      }

      let updates: VMConfigArgs | undefined;
      if (options.pauseOnStart !== undefined) {
        updates = {
          pauseOnStart: options.pauseOnStart,
        };
      }

      if (options.experimentalMode !== undefined) {
        if (updates === undefined) {
          updates = {};
        }
        updates.disableStrictModuleLoad = options.experimentalMode === 'on';
      }

      const dev = await getDeviceConfiguration(idOrName, updates);
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

      const wasmPath = options.wasm ?? (await platform.getUploadedWasm());
      if (wasmPath === undefined) {
        program.error(`No previously uploaded wasm found`);
        return;
      }

      const arg: WasmCompilerArgs = {
        wasmPath,
      };
      const build = await platform.buildForPlatform(arg, maxWaitTime);
      if (build !== 0) {
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
