import { type MappingItem } from 'source-map';
import { type SourceCodeLocation } from './old_source_map';
import { createLogger } from '../logger/logger';
import { WasmModule } from '../webassembly/wasm/wasm_module';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';

const logger = createLogger('SourceMap');

export class SourceMap {
  private readonly _sourceToAbsPathSource: Map<string, string>;
  private readonly _sources: string[];
  private readonly _mappings: MappingItem[];
  private readonly _pathToSourceMap: string;
  private readonly _wasmPath: string;
  public readonly wasm: WasmModule;

  constructor(
    pathToSourceMap: string,
    wasmPath: string,
    absolutePathSources: string[],
    sources: string[],
    mappings: MappingItem[],
  ) {
    this._pathToSourceMap = pathToSourceMap;
    this._wasmPath = wasmPath;
    this._sourceToAbsPathSource = new Map();
    this._sources = sources;
    this._mappings = mappings;

    if (sources.length !== absolutePathSources.length) {
      throw new Error(
        `Sources size #${sources.length} !== absolutePath Sources size #${absolutePathSources.length} `,
      );
    }

    for (let i = 0; i < sources.length; i++) {
      this._sourceToAbsPathSource.set(sources[i], absolutePathSources[i]);
    }

    this.wasm = new WasmModule(this._wasmPath);
  }

  get sources(): string[] {
    return this._sources;
  }

  public generatedPositionFor(location: SourceCodeLocation): MappingItem[] {
    const positions: MappingItem[] = [];
    const candidates = this._mappings.filter((m) => {
      return m.originalLine === location.linenr;
    });

    for (const s of candidates) {
      const colStart = location.columnStart;
      if (colStart !== undefined) {
        if (colStart > s.originalColumn) {
          continue;
        }
      }

      const colEnd = location.columnEnd;
      if (colEnd !== undefined) {
        logger.warn(
          `Ignoring columEnd ${colEnd} as sourceMap has only column field`,
        );
      }

      positions.push(s);
    }
    return positions;
  }

  // move next method to AST
  public getFunction(id: number): WASMFunction | undefined {
    if (id >= this.wasm.imports.length) {
      return this.wasm.functions.find((f) => {
        return f.id === id;
      });
    } else {
      return this.wasm.imports.find((f) => {
        return f.id === id;
      });
    }
  }

  // AS generatedPositionFor
  // public generatedPositionFor(
  //   location: SourceCodeLocation,
  // ): SourceCodeMapping[] {
  //   const positions: SourceCodeMapping[] = [];
  //   const candidates = this._mappings.filter((m) => {
  //     return m.originalLine === location.linenr;
  //   });

  //   for (const s of candidates) {
  //     // if (s.originalLine !== location.linenr) {
  //     //   continue;
  //     // }
  //     const colStart = location.columnStart;
  //     if (colStart !== undefined) {
  //       if (colStart > s.originalColumn) {
  //         continue;
  //       }
  //     }

  //     const colEnd = location.columnEnd;
  //     if (colEnd !== undefined) {
  //       logger.warn(
  //         `Ignoring columEnd ${colEnd} as sourceMap has only column field`,
  //       );
  //     }

  //     const instruction = this.wasm.instructionFromAddress(s.generatedColumn);
  //     if (instruction === undefined) {
  //       logger.error(
  //         `Skipping a wasm instruction unncesserily. TODO remove wasm instruction from mapping`,
  //       );
  //       throw new Error(
  //         `Skipping a wasm instruction unncesserily. TODO remove wasm instruction from mapping`,
  //       );
  //     }
  //     const m: SourceCodeMapping = {
  //       source: s.source,
  //       address: s.generatedColumn,
  //       linenr: location.linenr,
  //       columnStart: s.originalColumn,
  //       columnEnd: s.originalColumn,
  //       instruction,
  //     };
  //     positions.push(m);
  //   }
  //   return positions;
  // }

  public getOriginalPositionFor(wasmAddr: number): MappingItem | undefined {
    const maps = this._mappings
      .filter((m: MappingItem) => {
        return m.generatedColumn === wasmAddr;
      })
      .map((m: MappingItem) => {
        const src = this._sourceToAbsPathSource.get(m.source);
        if (src === undefined) {
          throw new Error(`No absolutePath set for Source ${m.source}`);
        }
        m.source = src;
        return m;
      });

    if (maps.length > 1) {
      throw new Error(
        `More than one possible mapping found #${maps.length} mappings`,
      );
    } else if (maps.length === 0) {
      return undefined;
    } else {
      return maps[0];
    }
  }

  // AS getOriginalPositionFor
  // public override getOriginalPositionFor(
  //   wasmAddr: number,
  // ): SourceCodeMapping | undefined {
  //   let m = this._mappings.find((m: MappingItem) => {
  //     return m.generatedColumn === wasmAddr;
  //   });

  //   let instruction: WasmInstruction | undefined;
  //   if (m === undefined) {
  //     instruction = this.wasm.instructionFromAddress(wasmAddr);
  //     if (instruction === undefined) {
  //       return undefined;
  //     }
  //     m = this._mappings.find((mi: MappingItem) => {
  //       return mi.generatedColumn === instruction?.startAddress;
  //     });
  //   }
  //   if (m?.source === undefined || m?.source === null) {
  //     return undefined;
  //   }
  //   const src = this._sourceToAbsPathSource.get(m.source);
  //   if (src === undefined) {
  //     throw new Error(`No absolutePath set for Source ${m.source}`);
  //   }
  //   instruction = this.wasm.instructionFromAddress(wasmAddr);
  //   if (instruction === undefined) {
  //     return undefined;
  //   }
  //   return {
  //     source: src,
  //     address: m.generatedColumn,
  //     linenr: m.originalLine,
  //     columnStart: m.originalColumn,
  //     columnEnd: m.originalColumn,
  //     instruction,
  //   };
  // }
}
