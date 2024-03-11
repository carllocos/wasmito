import { getGlobalLogger } from '../logger/logger';
import { PlatformTarget, type PlatformBuilderConfig } from './platform_config';
import { type Platform } from './platform';
import { ArduinoBoardBuilder } from './platforms/arduino_platform';
import { DevVMPlatform } from './platforms/dev_vm_platform';

export class BoardBuilderFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoardBuilderFactoryError';
    Error.captureStackTrace(this, BoardBuilderFactoryError);
  }
}

export function createPlatformBuilder(
  platformConfig: PlatformBuilderConfig,
  outputDir: string = '',
): Platform {
  switch (platformConfig.target) {
    case PlatformTarget.Arduino:
      getGlobalLogger().info(
        `Creating Arduino Board Builder for ${platformConfig.deviceConfig.name}`,
      );
      return new ArduinoBoardBuilder(platformConfig, outputDir);
    case PlatformTarget.DevVM:
      getGlobalLogger().info(
        `Creating Development VM for ${platformConfig.deviceConfig.name}`,
      );
      return new DevVMPlatform(platformConfig, outputDir);
    default: {
      const errMsg = `Cannot create Unsupported Board Builder for ${platformConfig.deviceConfig.name}`;
      getGlobalLogger().error(errMsg);
      throw new BoardBuilderFactoryError(errMsg);
    }
  }
}
