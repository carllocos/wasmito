import { type MappingItem } from 'source-map';
import { createLogger } from '../logger/logger';
import { WasmModule } from '../webassembly/wasm/wasm_module';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import { isFilePath, pathJoin, pathsEqual } from '../util/file_util';
import { writeFileSync } from 'fs';

const logger = createLogger('SourceMap');

export function equalSourceCodeLocations(
  loc1: SourceCodeLocation,
  loc2: SourceCodeLocation,
): boolean {
  return (
    loc1.linenr === loc2.linenr &&
    loc1.colnr === loc2.colnr &&
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

export function sourceCodeLocationToString(m: SourceCodeLocation): string {
  return `{
    "source":"${m.source}",
    "address": ${m.address},
    "linenr": ${m.linenr},
    "colnr": ${m.colnr},
    "name": "${m.name}"
  }`;
}

export interface SourceMapConfig {
  srcToAbsPath?: Map<string, string>;
  ignoreDirectories?: string[];
  prefixSources?: string;
}

export interface SourceMapJSON {
  wasm: string;
  sources: string[];
  mappings: SourceCodeLocation[];
}

export function isSourceCodeLocation(v: any): v is SourceCodeLocation {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.source === 'string' &&
    typeof v.address === 'number' &&
    typeof v.linenr === 'number' &&
    typeof v.colnr === 'number' &&
    typeof v.name === 'string'
  );
}

export function isSourceMapJSON(arg: any): arg is SourceMapJSON {
  if (
    typeof arg === 'object' &&
    arg !== null &&
    typeof arg.wasm === 'string' &&
    Array.isArray(arg.mappings) &&
    Array.isArray(arg.sources)
  ) {
    for (const s of arg.sources) {
      if (typeof s !== 'string') {
        return false;
      }
    }
    for (const m of arg.mappings) {
      if (!isSourceCodeLocation(m)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export class SourceMap {
  private readonly _sourceToAbsPathSource: Map<string, string>;
  private readonly _ignoreDirs: string[];
  private readonly _prefixPath?: string;
  private readonly _sources: string[];
  private readonly _mappings: SourceCodeLocation[];
  private readonly _wasmPath: string;
  public readonly wasm: WasmModule;

  constructor(
    wasmPath: string,
    sources: string[],
    mappings: SourceCodeLocation[],
    config?: SourceMapConfig,
  ) {
    this._wasmPath = wasmPath;
    this._sourceToAbsPathSource = config?.srcToAbsPath ?? new Map();
    this._ignoreDirs = config?.ignoreDirectories ?? [];
    this._prefixPath = config?.prefixSources;
    this._sources = [];

    if (config?.prefixSources !== undefined) {
      for (const s of sources) {
        const ps = pathJoin(config.prefixSources, s);
        this._sources.push(isFilePath(ps) ? ps : s);
      }
    } else {
      this._sources = sources;
    }

    // remove duplicate mappings
    // ignore mappings that are supposed to be ignored
    const tbl = new Map<number, SourceCodeLocation>();
    const cleanedMappings: SourceCodeLocation[] = [];
    for (const m of mappings) {
      if (config?.prefixSources !== undefined) {
        const newPath = pathJoin(config.prefixSources, m.source);
        if (isFilePath(newPath)) {
          m.source = newPath;
        }
      }
      const found = this._ignoreDirs.find((dir) => {
        return m.source.startsWith(dir);
      });
      if (found !== undefined) {
        continue;
      }

      const sl = tbl.get(m.address);
      if (sl === undefined) {
        cleanedMappings.push(m);
        tbl.set(m.address, m);
        continue;
      }

      if (
        sl.linenr === m.linenr &&
        sl.colnr === m.colnr &&
        sl.name === m.name &&
        sl.source === m.source
      ) {
        continue;
      }
      // logger.error(
      //   `Found 2 different source location for the same Wasm addr ${m.address} loc1 ${sourceCodeLocationToString(m)}
      //   loc2 ${sourceCodeLocationToString(sl)}`,
      // );
    }

    this._mappings = cleanedMappings;
    this.wasm = new WasmModule(this._wasmPath);
  }

  get sources(): string[] {
    return this._sources;
  }

  get mappings(): SourceCodeLocation[] {
    return this._mappings;
  }

  public generatedPositionFor(
    location: SourceCodeLocation,
  ): SourceCodeLocation[] {
    const positions: SourceCodeLocation[] = [];
    const candidates = this._mappings.filter((m) => {
      return m.linenr === location.linenr;
    });
    logger.debug(
      `#${candidates.length} candidates for SourceLoc {${location.source}, ${location.linenr}, ${location.colnr}}`,
    );

    for (const c of candidates) {
      const colStart = location.colnr;
      if (colStart === c.colnr) {
        positions.push(c);
      }
    }

    logger.debug(
      `#${positions.length} found for SourceLoc {${location.source}, ${location.linenr}, ${location.colnr}}`,
    );
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

  public getOriginalPositionFor(wasmAddr: number): SourceCodeLocation[] {
    const maps = this._mappings
      .filter((m: SourceCodeLocation) => {
        return m.address === wasmAddr;
      })
      .map((m: SourceCodeLocation) => {
        const src = this._sourceToAbsPathSource.get(m.source);
        if (src !== undefined) {
          m.source = src;
        }
        return m;
      });

    if (maps.length > 1) {
      const mappings: string = maps.map(sourceCodeLocationToString).join(', ');
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
    let maps = this._mappings.map((m: SourceCodeLocation) => {
      const src = this._sourceToAbsPathSource.get(m.source);
      if (src !== undefined) {
        m.source = src;
      }
      return m;
    });
    if (onlyExistingSource) {
      maps = maps.filter((m) => isFilePath(m.source));
    }
    const mpsStr = maps.map(sourceCodeLocationToString).join(',');
    const sourcesStr = this._sources
      .map((s) => {
        return `"${s}"`;
      })
      .join(',');
    const content = `{"wasm":"${this._wasmPath}","sources":[${sourcesStr}],"mappings":[${mpsStr}]}`;
    writeFileSync(filePath, content);
  }
}
