import { makeSourceCodeCompiler } from '../../source_mappers/compilers/compiler_factory';
import { type ProgLangSelectionArgs } from '../../source_mappers/compilers/prog_language_selection';
import { createDirectoryIfUnexisting } from '../../util/file_util';
import { type PlatformConfig } from '../platform_config';
import { Platform } from '../platform';

export class DevVMPlatform extends Platform {
  // private readonly pathToSourceCodeFile: string;

  constructor(config: PlatformConfig, outputDir: string = '') {
    super(config, outputDir);
    // this.pathToSourceCodeFile = ''; // path to uncompiled source code
  }

  async createCompiler(selectedLanguage: ProgLangSelectionArgs): Promise<void> {
    createDirectoryIfUnexisting(this.outputDirectory);

    this._sourceCodeCompiler = await makeSourceCodeCompiler(
      selectedLanguage,
      this.outputDirectory,
    );
  }

  async compileSourceCode(sourceCodeCompilationArgs: any): Promise<number> {
    this._sourceMap = await this.compiler.compile(sourceCodeCompilationArgs);
    if (this._sourceMap === undefined) {
      return -1;
    } else {
      this.config.vmConfig.program = this._sourceMap.getWasmPath();
      return 0;
    }
  }

  async buildForPlatform(sourceCodeCompilationArgs: any): Promise<number> {
    return await this.compileSourceCode(sourceCodeCompilationArgs);
  }

  async upload(): Promise<number> {
    return 0;
  }
}
