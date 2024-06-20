import { type MappingItem } from 'source-map';
import { createLogger } from '../logger/logger';
import { WasmModule } from '../webassembly/wasm/wasm_module';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import { isFilePath, pathsEqual } from '../util/file_util';
import { writeFileSync } from 'fs';

const logger = createLogger('SourceMap');

// TODO Sourcelocation will be gone and replaced by ASTMapping of adaptor.
// Or remove?
export interface SourceCodeLocation2 {
  source: string;
  linenr: number;
  columnStart?: number;
  columnEnd?: number;
}

export function equalSourceCodeLocations(
  loc1: SourceCodeLocation2,
  loc2: SourceCodeLocation2,
): boolean {
  return (
    loc1.linenr === loc2.linenr &&
    loc1.columnEnd === loc2.columnEnd &&
    loc1.columnStart === loc2.columnStart &&
    pathsEqual(loc1.source, loc2.source)
  );
}

export interface SourceCodeLocation {
  source: string;
  address: number;
  linenr: number;
  colnr: number;
  name: string;
}

export function mappingItemToSourceCodeLocation(
  m: MappingItem,
): SourceCodeLocation {
  return {
    source: m.source,
    address: m.generatedColumn,
    linenr: m.originalLine,
    colnr: m.originalColumn,
    name: m.name,
  };
}

export function mappingItemToString(m: MappingItem): string {
  return `{
    "source":"${m.source}",
    "address": ${m.generatedColumn},
    "linenr": ${m.originalLine},
    "colnr": ${m.originalColumn},
    "name": "${m.name}"
  }`;
}

export class SourceMap {
  private readonly _sourceToAbsPathSource: Map<string, string>;
  private readonly _sources: string[];
  private readonly _mappings: MappingItem[];
  private readonly _wasmPath: string;
  public readonly wasm: WasmModule;
  public readonly targetLanguage: string;

  constructor(
    targetLanguage: string,
    wasmPath: string,
    sources: string[],
    mappings: MappingItem[],
    srcToAbsPath = new Map<string, string>(),
  ) {
    this.targetLanguage = targetLanguage;
    this._wasmPath = wasmPath;
    this._sourceToAbsPathSource = srcToAbsPath;
    this._sources = sources;
    this._mappings = mappings;

    this.wasm = new WasmModule(this._wasmPath);
  }

  get sources(): string[] {
    return this._sources;
  }

  get mappings(): SourceCodeLocation[] {
    return this._mappings.map(mappingItemToSourceCodeLocation);
  }

  public generatedPositionFor(location: SourceCodeLocation): MappingItem[] {
    const positions: MappingItem[] = [];
    const candidates = this._mappings.filter((m) => {
      return m.originalLine === location.linenr;
    });
    logger.debug(
      `#${candidates.length} candidates for SourceLoc {${location.linenr}, ${location.columnStart}}`,
    );

    for (const c of candidates) {
      const colStart = location.columnStart;
      if (colStart === c.originalColumn) {
        positions.push(c);
      }
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

  public getOriginalPositionFor(wasmAddr: number): MappingItem[] {
    const maps = this._mappings
      .filter((m: MappingItem) => {
        return m.generatedColumn === wasmAddr;
      })
      .map((m: MappingItem) => {
        const src = this._sourceToAbsPathSource.get(m.source);
        if (src !== undefined) {
          m.source = src;
        }
        return m;
      });

    if (maps.length > 1) {
      const mappings: string = maps.map(mappingItemToString).join(', ');
      logger.debug(
        `More than one possible mapping  found for wasmAddr ${wasmAddr} #${maps.length} mappings: [${mappings}]`,
      );
    }
    return maps;
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

  storeMappingsToJSON(
    filePath: string,
    onlyExistingSource: boolean = false,
  ): void {
    let maps = this._mappings.map((m: MappingItem) => {
      const src = this._sourceToAbsPathSource.get(m.source);
      if (src !== undefined) {
        m.source = src;
      }
      return m;
    });
    if (onlyExistingSource) {
      maps = maps.filter((m) => isFilePath(m.source));
    }
    const mpsStr = maps.map(mappingItemToString).join(',');

    const content = `{"language":"${this.targetLanguage}", "mappings":[${mpsStr}]}`;
    writeFileSync(filePath, content);
  }
}
