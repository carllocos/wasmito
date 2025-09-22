import { type MappingItem } from 'source-map';
import { createLogger } from '../logger/logger';
import { WasmModule } from '../webassembly/wasm/wasm_module';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import { isFilePath, pathsEqual } from '../util/file_util';
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

export function strictEqualSourceCodeLocations(
  loc1: SourceCodeLocation,
  loc2: SourceCodeLocation,
): boolean {
  return equalSourceCodeLocations(loc1, loc2) && loc1.address === loc2.address;
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
  return `{"source":"${m.source}", "address": ${m.address}, "linenr": ${m.linenr}, "colnr": ${m.colnr},"name": "${m.name}"}`;
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
  private readonly _sources: string[];
  private readonly _mappings: SourceCodeLocation[];
  private readonly _wasmPath: string;
  public readonly wasm: WasmModule;

  constructor(
    wasmPath: string | SourceMap, // TODO get rid of duble type here
    sources: string[],
    mappings: SourceCodeLocation[],
  ) {
    this._wasmPath =
      wasmPath instanceof SourceMap ? wasmPath.wasm.wasmPath : wasmPath;
    this._sources = sources;
    this._mappings = mappings;
    this.wasm =
      wasmPath instanceof SourceMap
        ? wasmPath.wasm
        : new WasmModule(this._wasmPath);
  }

  get sources(): string[] {
    return this._sources;
  }

  get mappings(): SourceCodeLocation[] {
    return this._mappings.map((m) => {
      return Object.assign({}, m);
    });
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

  public allMappings(): SourceCodeLocation[] {
    return this._mappings;
  }

  // move next method to AST
  public getFunction(id: number): WASMFunction | undefined {
    if (id >= this.wasm.importFuncs.length) {
      return this.wasm.functions.find((f) => {
        return f.id === id;
      });
    } else {
      return this.wasm.importFuncs.find((f) => {
        return f.id === id;
      });
    }
  }

  public getOriginalPositionFor(wasmAddr: number): SourceCodeLocation[] {
    const maps = this._mappings.filter((m: SourceCodeLocation) => {
      return m.address === wasmAddr;
    });

    if (maps.length > 1) {
      const mappings: string = maps.map(sourceCodeLocationToString).join(', ');
      logger.debug(
        `More than one possible mapping  found for wasmAddr ${wasmAddr} #${maps.length} mappings: [${mappings}]`,
      );
    }
    return maps;
  }

  storeMappingsToJSON(
    filePath: string,
    onlyExistingSource: boolean = false,
  ): void {
    const sm: SourceMapJSON = {
      wasm: this._wasmPath,
      sources: this._sources,
      mappings: this._mappings,
    };
    StoreMappingsToJSON(filePath, sm, onlyExistingSource);
  }
}

export function StoreMappingsToJSON(
  filePath: string,
  sourceMap: SourceMapJSON,
  onlyExistingSource: boolean = false,
  sourceToAbsPathSource = new Map<string, string>(),
): void {
  let maps = sourceMap.mappings.map((m: SourceCodeLocation) => {
    const src = sourceToAbsPathSource.get(m.source);
    if (src !== undefined) {
      m.source = src;
    }
    return m;
  });
  if (onlyExistingSource) {
    maps = maps.filter((m) => isFilePath(m.source));
  }
  const mpsStr = maps.map(sourceCodeLocationToString).join(',');
  const sourcesStr = sourceMap.sources
    .map((s) => {
      return `"${s}"`;
    })
    .join(',');
  const content = `{"wasm":"${sourceMap.wasm}","sources":[${sourcesStr}],"mappings":[${mpsStr}]}`;
  writeFileSync(filePath, content);
}
