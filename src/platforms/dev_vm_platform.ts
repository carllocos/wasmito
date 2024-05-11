import { makeSourceCodeCompiler } from '../compilers/compiler_factory';
import { type ProgLangSelectionArgs } from '../compilers/prog_language_selection';
import { createDirectoryIfUnexisting } from '../util/file_util';
import { type PlatformConfig } from './platform_config';
import { Platform } from './platform';
import { maybeTimeoutPromise } from '../util/promise_util';

export class DevVMPlatform extends Platform {
  // private readonly pathToSourceCodeFile: string;

  constructor(config: PlatformConfig, outputDir: string = '') {
    super(config, outputDir);
    // this.pathToSourceCodeFile = ''; // path to uncompiled source code
  }

  async createCompiler(selectedLanguage: ProgLangSelectionArgs): Promise<void> {
    createDirectoryIfUnexisting(this.outputDirectory);

    this._sourceCodeCompiler = makeSourceCodeCompiler(
      selectedLanguage,
      this.outputDirectory,
    );
  }

  async compileSourceCode(
    sourceCodeCompilationArgs: any,
    maxWaitTime?: number,
  ): Promise<number> {
    this._languageAdaptor = await maybeTimeoutPromise(
      this.compiler.compile(sourceCodeCompilationArgs),
      maxWaitTime,
    );
    if (this._languageAdaptor === undefined) {
      return -1;
    } else {
      this.config.vmConfig.program =
        this._languageAdaptor.sourceMap.wasm.wasmPath;
      return 0;
    }
  }

  async buildForPlatform(
    sourceCodeCompilationArgs: any,
    maxWaitTime?: number,
  ): Promise<number> {
    return await this.compileSourceCode(sourceCodeCompilationArgs, maxWaitTime);
  }

  async upload(): Promise<number> {
    return 0;
  }
}
