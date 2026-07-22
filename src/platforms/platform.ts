import { createLogger, Logger } from '../logger/logger';
import { getPath2WARDuinoSDK, readProjectName } from '../project_config';
import { type PlatformConfig } from './platform_config';
import { createTempDirectory, getAbsolutePath } from '../util/file_util';

export class PlatformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlatformError';
    Error.captureStackTrace(this, PlatformError);
  }
}

export abstract class Platform {
  protected readonly logger: Logger;
  public readonly config: PlatformConfig;
  protected readonly sdkPath: string;
  protected readonly tmpDirPrefix: string;
  protected readonly outputDirectory: string;

  constructor(config: PlatformConfig, outputDir: string = '') {
    this.config = config;
    this.tmpDirPrefix = `${readProjectName().replace(/\s+/g, '-')}-`;
    this.logger = createLogger(`PlatformBuilder ${config.deviceIdentity.name}`);

    this.sdkPath = getPath2WARDuinoSDK() ?? '';
    if (this.sdkPath === '') {
      throw new PlatformError(
        'WARDuinoSDK has not been set. Configure the path via the global configuration `project_config.ts` file or `WARUINO_SDK` env variable',
      );
    }
    this.outputDirectory = outputDir;
    if (outputDir === '') {
      this.logger.debug(
        'No build output directory set. Falling back to tmp dir',
      );
      this.outputDirectory = createTempDirectory(this.tmpDirPrefix);
    }
    this.outputDirectory = getAbsolutePath(this.outputDirectory);
    this.logger.debug(`Using output directory: ${this.outputDirectory}`);
  }

  get compilationOutputPath(): string {
    return this.outputDirectory;
  }

  abstract buildForPlatform(
    wasmPath: string,
    maxWaitTime?: number,
  ): Promise<number>;

  abstract upload(): Promise<number>;

  abstract getUploadedWasm(): Promise<string | undefined>;
}
