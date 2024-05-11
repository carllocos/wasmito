import type winston from 'winston';
import { createLogger } from '../logger/logger';
import { getPath2WARDuinoSDK, readProjectName } from '../project_config';
import { type PlatformConfig } from './platform_config';
import { createTempDirectory, getAbsolutePath } from '../util/file_util';
import { type SourceCodeCompiler } from '../compilers/compiler';
import { type ProgLangSelectionArgs } from '../compilers/prog_language_selection';
import { type LanguageAdaptor } from '../language_adaptors/language_adaptor';
import { type SourceMap } from '../source_mappers/source_map';

export class PlatformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlatformError';
    Error.captureStackTrace(this, PlatformError);
  }
}

export abstract class Platform {
  protected readonly logger: winston.Logger;
  public readonly config: PlatformConfig;
  protected readonly sdkPath: string;
  protected readonly tmpDirPrefix: string;
  protected readonly outputDirectory: string;
  protected _sourceCodeCompiler?: SourceCodeCompiler;
  protected _languageAdaptor?: LanguageAdaptor;

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
      this.logger.info(
        'No build output directory set. Falling back to tmp dir',
      );
      this.outputDirectory = createTempDirectory(this.tmpDirPrefix);
    }
    this.outputDirectory = getAbsolutePath(this.outputDirectory);
    this.logger.info(`Using output directory: ${this.outputDirectory}`);
  }

  get sourceMap(): SourceMap {
    if (this._languageAdaptor === undefined) {
      throw new Error(
        `No SourceMap available for the platform. Compile some source code first`,
      );
    }
    return this._languageAdaptor.sourceMap;
  }

  get compilationOutputPath(): string {
    return this.outputDirectory;
  }

  get compiler(): SourceCodeCompiler {
    if (this._sourceCodeCompiler === undefined) {
      throw new PlatformError(`No compiler has set for this Platform yet`);
    }
    return this._sourceCodeCompiler;
  }

  set compiler(c: SourceCodeCompiler) {
    this._sourceCodeCompiler = c;
  }

  abstract createCompiler(
    selectedLanguage: ProgLangSelectionArgs,
  ): Promise<void>;

  abstract buildForPlatform(
    sourceCodeCompilationArgs: any,
    maxWaitTime?: number,
  ): Promise<number>;

  abstract compileSourceCode(
    sourceCodeCompilationArgs: any,
    maxWaitTime?: number,
  ): Promise<number>;

  abstract upload(): Promise<number>;

  public getSourceMap(): SourceMap | undefined {
    return this._languageAdaptor?.sourceMap;
  }
}
