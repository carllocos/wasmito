import { SourceCodeCompiler } from './compiler';
import { getAbsolutePath } from '../../util/file_util';
import {
  isTargetLanguage,
  type TargetLanguage,
} from './prog_language_selection';
import { SourceMapConcrete } from '../source_map_concrete';

export interface DefaultCompileArgs {
  pathToSrcRoot: string;
  pathToSourceMap: string;
  pathToWasm: string;
}

function isDefaultCompileArgs(obj: any): obj is DefaultCompileArgs {
  // Check if the object has all the required properties
  if (
    typeof obj === 'object' &&
    'pathToSrcRoot' in obj &&
    'pathToSourceMap' in obj &&
    'pathToWasm' in obj
  ) {
    // Check if each property is of type string
    return (
      typeof obj.pathToSrcRoot === 'string' &&
      typeof obj.pathToSourceMap === 'string' &&
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

  async compile(compilerArgs: DefaultCompileArgs): Promise<SourceMapConcrete> {
    if (!isDefaultCompileArgs(compilerArgs)) {
      throw new Error(`Invalid compile args`);
    }

    const sm = await SourceMapConcrete.fromSourceMapPath(
      compilerArgs.pathToSrcRoot,
      compilerArgs.pathToSourceMap,
      compilerArgs.pathToWasm,
    );
    this._lastCompileArgs = compilerArgs;
    return sm;
  }
}
