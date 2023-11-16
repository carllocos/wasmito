import type winston from 'winston';
import { createLogger } from '../logger/logger';
import { getPath2WARDuinoSDK, readProjectName } from '../project_config';
import { type PlatformBuilderConfig } from './platform_config';
import { createTempDirectory } from '../util/file_util';

export class PlatformBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlatformBuilderError';
    Error.captureStackTrace(this, PlatformBuilderError);
  }
}

export abstract class PlatformBuilder {
  protected readonly logger: winston.Logger;
  protected readonly platformConfig: PlatformBuilderConfig;
  protected readonly sdkPath: string;
  protected readonly tmpDirPrefix: string;
  protected readonly outputDirectory: string;

  constructor(config: PlatformBuilderConfig, outputDir: string = '') {
    this.platformConfig = config;
    this.tmpDirPrefix = `${readProjectName().replace(/\s+/g, '-')}-`;
    this.logger = createLogger(`PlatformBuilder ${config.deviceConfig.name}`);

    this.sdkPath = getPath2WARDuinoSDK() ?? '';
    if (this.sdkPath === '') {
      throw new PlatformBuilderError(
        'WARDuinoSDK has not been set. Configure the path via the global configuration `project_config.ts` file or `WARUINO_SDK` env variable',
      );
    }
    this.outputDirectory = outputDir;
    if (outputDir === '') {
      this.logger.info(
        'No build output directory set. Falling back to tmp file',
      );
      this.outputDirectory = createTempDirectory(this.tmpDirPrefix);
    }
    this.logger.info(`Using output directory: ${this.outputDirectory}`);
  }

  abstract compile(sourceFile: string): Promise<number>;

  abstract upload(): Promise<number>;

  abstract getWasmPath(): string;

  abstract getWasm(): Promise<Buffer>;
}
