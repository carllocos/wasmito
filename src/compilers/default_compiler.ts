import { SourceCodeCompiler } from './compiler';
import { getAbsolutePath } from '../util/file_util';
import {
  isTargetLanguage,
  type TargetLanguage,
} from './prog_language_selection';
import {
  type LanguageAdaptor,
  constructLanguageAdaptor,
} from '../language_adaptors/language_adaptor';
import {
  SourceMapfromDWARFWasm,
  SourceMapFromJSON,
  SourceMapFromSourceMapSpec,
} from '../source_mappers/source_map_builder';
import { type SourceMap } from '../source_mappers';

export interface DefaultCompileArgs {
  pathToSrcRoot: string;
  pathToSourceMap?: string;
  pathToJsonMap?: string;
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

    this._lastCompileArgs = compilerArgs;
    let sm: SourceMap | undefined;
    if (compilerArgs.pathToSourceMap !== undefined) {
      sm = await SourceMapFromSourceMapSpec(
        compilerArgs.pathToSourceMap,
        compilerArgs.pathToWasm,
        { lineNrStartNumber: 0, colNrStartNumber: 0 },
      );
    } else if (compilerArgs.pathToJsonMap !== undefined) {
      sm = await SourceMapFromJSON(compilerArgs.pathToJsonMap);
    } else {
      sm = await SourceMapfromDWARFWasm(compilerArgs.pathToWasm);
    }
    return await constructLanguageAdaptor(sm);
  }
}
