import { type DeviceIdentityArgs } from '../device/device_config';
import { type VMConfigArgs } from '../device/vm_config';
import { getGlobalLogger } from '../logger/logger';
import { type ProgLangSelectionArgs } from '../source_mappers/compilers/prog_language_selection';
import { PlatformConfig, PlatformTarget } from './platform_config';
// import { type Platform } from './platform';
import { ArduinoBoardBuilder } from './platforms/arduino_platform';
import { DevVMPlatform } from './platforms/dev_vm_platform';

export class BoardBuilderFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoardBuilderFactoryError';
    Error.captureStackTrace(this, BoardBuilderFactoryError);
  }
}

export interface FactoryArgs {
  vmConfig?: VMConfigArgs;
  deviceIdentity?: DeviceIdentityArgs;
  selectedLanguage?: ProgLangSelectionArgs;
}

export async function createDevPlatform(
  args: FactoryArgs,
  outputDir?: string,
): Promise<DevVMPlatform> {
  getGlobalLogger().info(`Creating Development Platform...`);
  const config: PlatformConfig = await PlatformConfig.fromConfigArgs(
    PlatformTarget.DevVM,
    args,
  );
  const platform = new DevVMPlatform(config, outputDir);
  if (args.selectedLanguage !== undefined) {
    await platform.createCompiler(args.selectedLanguage);
  }
  return platform;
}

export async function createArduinoPlatform(
  args: FactoryArgs,
  outputDir?: string,
): Promise<ArduinoBoardBuilder> {
  getGlobalLogger().info(`Creating ArduinoPlatform...`);
  const config: PlatformConfig = await PlatformConfig.fromConfigArgs(
    PlatformTarget.Arduino,
    args,
  );
  const platform = new ArduinoBoardBuilder(config, outputDir);
  if (args.selectedLanguage !== undefined) {
    await platform.createCompiler(args.selectedLanguage);
  }
  return platform;
}
