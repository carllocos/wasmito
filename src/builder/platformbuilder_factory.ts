import { getGlobalLogger } from '../logger/logger';
import { type PlatformBuilder } from './platformbuilder';
import { Platform, type PlatformBuilderConfig } from './platform_config';
import { ArduinoBoardBuilder } from './platforms/arduino_platform';
import { EmulatorPlatform } from './platforms/emulator_platform';

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
): PlatformBuilder {
  switch (platformConfig.platform) {
    case Platform.Arduino:
      getGlobalLogger().info(
        `Creating Arduino Board Builder for ${platformConfig.deviceConfig.name}`,
      );
      return new ArduinoBoardBuilder(platformConfig, outputDir);
    case Platform.Emulated:
      getGlobalLogger().info(
        `Creating Emulator for ${platformConfig.deviceConfig.name}`,
      );
      return new EmulatorPlatform(platformConfig, outputDir);
    default: {
      const errMsg = `Cannot create Unsupported Board Builder for ${platformConfig.deviceConfig.name}`;
      getGlobalLogger().error(errMsg);
      throw new BoardBuilderFactoryError(errMsg);
    }
  }
}
