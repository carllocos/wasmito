import {
  getAbsolutePath,
  getFileName,
  isAbsolutePath,
} from '../util/file_util';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import { WasmModule } from '../webassembly/wasm/wasm_module';
import { type WasmInstruction } from '../webassembly/wasm/wasm_instruction';

export interface SourceCodeMapping {
  source: string;
  address: number;
  linenr: number;
  columnStart: number;
  columnEnd: number;
  instruction: WasmInstruction;
}

export interface SourceCodeLocation {
  linenr: number;
  columnStart?: number;
  columnEnd?: number;
}

// TODO Move to LangaugeAdaptor which will consist of
// 1. SourceMap Or Dwarf
// 2. AST or something in the kind
// 3. Mapper to VM apps
export abstract class SourceMap {
  private readonly _sources: string[];
  private readonly _filenames: string[];
  private readonly _wasmModule: WasmModule;

  constructor(sources: string[], wasmFilePath: string) {
    this._sources = sources.map(getAbsolutePath);
    this._sources.forEach((s) => {
      if (!isAbsolutePath(s)) {
        throw new Error(`source '${s}' is expected to be an absolute path`);
      }
    });
    this._filenames = this._sources.map(getFileName);
    this._wasmModule = new WasmModule(wasmFilePath);
  }

  get wasm(): WasmModule {
    return this._wasmModule;
  }

  get sources(): string[] {
    return this._sources;
  }

  get sourcesNames(): string[] {
    return this._filenames;
  }

  public abstract getFunction(id: number): WASMFunction | undefined;

  abstract getOriginalPositionFor(
    wasmAddr: number,
  ): SourceCodeMapping | undefined;

  public abstract generatedPositionFor(
    location: SourceCodeLocation,
  ): SourceCodeMapping[];

  public abstract nextSourceCodeLocation(
    source: string,
    currentLineNr: number,
    currentColumnStart: number,
  ): SourceCodeMapping[];
}
