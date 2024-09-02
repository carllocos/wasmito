import { SourceCodeCompiler } from './compiler';
import { createLogger } from '../logger/logger';
import { getAbsolutePath } from '../util/file_util';
import { TargetLanguage } from './prog_language_selection';
import {
  type LanguageAdaptor,
  constructLanguageAdaptor,
} from '../language_adaptors/language_adaptor';
import { SourceMap } from '../source_mappers/source_map';

const logger = createLogger('WasmCompiler');

export interface WasmCompilerArgs {
  wasmPath: string;
  mappingsJSON?: string;
}

function parseWasmArgs(args: any): WasmCompilerArgs {
  if (typeof args !== 'object') {
    throw new Error('WasmCompilerArgs expected to be an object');
  }

  const pathToWasmPath = args.wasmPath;
  if (typeof pathToWasmPath !== 'string') {
    throw new Error('wasmPath is mandatory and expected to be a string');
  }

  return {
    wasmPath: pathToWasmPath,
  };
}

export class WasmCompiler extends SourceCodeCompiler {
  public targetLanguage: TargetLanguage;
  private readonly _outputDir: string;
  private _lastCompileArgs?: WasmCompilerArgs;

  constructor(outputDir: string) {
    super();
    this._outputDir = getAbsolutePath(outputDir);
    this.targetLanguage = TargetLanguage.Wasm;
    logger.info(`Wasm selected`);
  }

  get latestSourceCodeCompilerArgs(): any {
    return this._lastCompileArgs;
  }

  async compile(compilerArgs: any): Promise<LanguageAdaptor> {
    this._lastCompileArgs = parseWasmArgs(compilerArgs);
    const sm = new SourceMap(this._lastCompileArgs.wasmPath, [], []);
    return await constructLanguageAdaptor(sm);
  }
}
