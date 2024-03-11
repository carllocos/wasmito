import { makeSourceCodeCompiler } from '../../source_mappers/compilers/compiler_factory';
import {
  createDirectoryIfUnexisting,
  getAbsolutePath,
} from '../../util/file_util';
import { type PlatformBuilderConfig } from '../platform_config';
import { Platform } from '../platform';

export class DevVMPlatform extends Platform {
  private pathToSourceCodeFile: string;

  constructor(config: PlatformBuilderConfig, outputDir: string = '') {
    super(config, outputDir);
    this.pathToSourceCodeFile = ''; // path to uncompiled source code
  }

  async compileSourceCode(sourceFile: string): Promise<number> {
    createDirectoryIfUnexisting(this.outputDirectory);

    this.pathToSourceCodeFile = getAbsolutePath(sourceFile);
    this.sourceCodeCompiler = makeSourceCodeCompiler(
      this.pathToSourceCodeFile,
      this.outputDirectory,
    );
    this.sourceMap = await this.sourceCodeCompiler.compile(
      this.pathToSourceCodeFile,
    );
    if (this.sourceMap === undefined) {
      return -1;
    } else {
      this.platformConfig.deviceConfig.vmConfig.program = sourceFile;
      return 0;
    }
  }

  async compile(sourceFile: string): Promise<number> {
    return await this.compileSourceCode(sourceFile);
  }

  async upload(): Promise<number> {
    return 0;
  }
}
