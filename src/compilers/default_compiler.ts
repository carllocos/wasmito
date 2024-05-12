import { SourceCodeCompiler } from './compiler';
import { getAbsolutePath } from '../util/file_util';
import {
  isTargetLanguage,
  type TargetLanguage,
} from './prog_language_selection';
import { SourceMap } from '../source_mappers/source_map';
import { LanguageAdaptor } from '../language_adaptors/language_adaptor';

export interface DefaultCompileArgs {
  pathToSrcRoot: string;
  pathToSourceMap?: string;
  pathToWasm: string;
}

function isDefaultCompileArgs(obj: any): obj is DefaultCompileArgs {
  // Check if the object has all the required properties
  if (
    typeof obj === 'object' &&
    'pathToSrcRoot' in obj &&
    'pathToWasm' in obj
  ) {
    // Check if each property is of type string
    return (
      typeof obj.pathToSrcRoot === 'string' &&
      (obj.pathToSourceMap === undefined ||
        typeof obj.pathToSourceMap === 'string') &&
      typeof obj.pathToWasm === 'string'
    );
  }
  return false;
}

export class DefaultCompiler extends SourceCodeCompiler {
  public targetLanguage: TargetLanguage;
  private readonly _outputDir: string;
  private _lastCompileArgs?: DefaultCompileArgs;

  constructor(targetLanguage: TargetLanguage, outputDir: string) {
    super();
    this._outputDir = getAbsolutePath(outputDir);
    if (!isTargetLanguage(targetLanguage)) {
      throw new Error(`Invalid target language`);
    }
    this.targetLanguage = targetLanguage;
  }

  get latestSourceCodeCompilerArgs(): any {
    return this._lastCompileArgs;
  }

  async compile(compilerArgs: DefaultCompileArgs): Promise<LanguageAdaptor> {
    if (!isDefaultCompileArgs(compilerArgs)) {
      throw new Error(`Invalid compile args`);
    }

    const sm = await SourceMap.fromSourceMapPath(
      compilerArgs.pathToSrcRoot,
      compilerArgs.pathToSourceMap,
      compilerArgs.pathToWasm,
    );
    this._lastCompileArgs = compilerArgs;
    return new LanguageAdaptor(sm);
  }
}
