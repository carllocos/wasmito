import { isSourceMapJSON, SourceMapJSON } from '../source_mappers/source_map';

export enum TargetLanguage {
  WAT = 'wat',
  AssemblyScript = 'ts',
  Rust = 'rs',
  Wasm = 'wasm',
}

export function isTargetLanguage(value: any): value is TargetLanguage {
  return Object.values(TargetLanguage).includes(value);
}

export interface ProgLangSelectionArgs {
  targetLanguage: TargetLanguage;
  wasmPath: string;
  mappingsJSON?: string | SourceMapJSON;
}

export function parseLangSelectionArgs(args: any): ProgLangSelectionArgs {
  if (typeof args !== 'object') {
    throw new Error('WasmCompilerArgs expected to be an object');
  }

  const targetLanguage = args.targetLanguage;
  if (typeof targetLanguage !== 'string' || !isTargetLanguage(targetLanguage)) {
    throw new Error('wasmPath is mandatory and expected to be a string');
  }

  const pathToWasmPath = args.wasmPath;
  if (typeof pathToWasmPath !== 'string') {
    throw new Error('wasmPath is mandatory and expected to be a string');
  }

  const mj = args.mappingsJSON;
  if (mj !== undefined && (typeof mj !== 'string' || !isSourceMapJSON(mj))) {
    throw new Error(
      'mappingsJSON is expected to be a string or a SourceMapJSON object',
    );
  }

  return {
    targetLanguage,
    wasmPath: pathToWasmPath,
    mappingsJSON: mj,
  };
}
