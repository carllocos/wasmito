import {
  type SourceCodeLocation,
  SourceMap,
  type SourceMapJSON,
  isSourceMapJSON,
  sourceCodeLocationToString,
} from './source_map';
import { createLogger } from '../logger/logger';
import { isFilePath, pathJoin, readFileAsJSONSync } from '../util/file_util';
import { WasmModule } from '../webassembly/wasm/wasm_module';
import { ReadDWARFMappings } from './debug_standards/dwarf_reader';
import { SourceMapConfig } from './source_map_config';
import { ReadSourceSpec } from './debug_standards/source_map_spec_reader';

const logger = createLogger('SourceMapBuilder');

export enum DebugStandard {
  DWARF = 'DWARF',
  SourceMapSpec = 'SourceMapSpec',
}

export async function readSourceMapJSON(
  standard: DebugStandard,
  wasmPath: string,
  debuggingInformationPath: string,
  config?: SourceMapConfig,
): Promise<SourceMapJSON> {
  let sourceMapJSON: SourceMapJSON | undefined;
  switch (standard) {
    case DebugStandard.DWARF: {
      sourceMapJSON = await ReadDWARFMappings(debuggingInformationPath);
      break;
    }
    case DebugStandard.SourceMapSpec: {
      sourceMapJSON = await ReadSourceSpec(debuggingInformationPath, wasmPath);
      break;
    }
    default:
      throw new Error(`unsupported debugging standard ${standard}`);
  }
  if (sourceMapJSON === undefined) {
    throw new Error(`Could not construct SourceMapJSON from ${standard}`);
  }

  return cleanSourceMapJSON(sourceMapJSON, config);
}
export async function readSourceMap(
  standard: DebugStandard,
  wasmPath: string,
  debuggingInformationPath: string,
  config?: SourceMapConfig,
): Promise<SourceMap> {
  const sm = await readSourceMapJSON(
    standard,
    wasmPath,
    debuggingInformationPath,
    config,
  );
  return new SourceMap(sm.wasm, sm.sources, sm.mappings);
}

export function SourceMapFromJSON(
  jsonPath: string | SourceMapJSON,
  config?: SourceMapConfig,
): SourceMap {
  let sm: SourceMapJSON | undefined = undefined;
  if (typeof jsonPath === 'string') {
    const content = readFileAsJSONSync(jsonPath);
    if (!isSourceMapJSON(content)) {
      throw new Error(
        `${jsonPath} does not satisfy the expected SourceMapJSON interface`,
      );
    }
    sm = content;
  } else {
    sm = jsonPath;
  }
  if (config !== undefined) {
    sm = cleanSourceMapJSON(sm, config);
  }

  return new SourceMap(sm.wasm, sm.sources, sm.mappings);
}

function cleanSourceMapJSON(
  sourceMap: SourceMapJSON,
  config?: SourceMapConfig,
): SourceMapJSON {
  let module: undefined | WasmModule;
  const wasmPath = config?.newWasmPath ?? sourceMap.wasm;
  if (
    config?.removeUnusedMappings !== undefined &&
    config.removeUnusedMappings
  ) {
    module = new WasmModule(wasmPath);
  }
  return {
    wasm: wasmPath,
    // convert to set to remove duplicates
    sources: cleanSources(Array.from(new Set(sourceMap.sources)), config),
    mappings: cleanMappings(sourceMap.mappings, config, module),
  };
}

function cleanMappings(
  sourceCodeLocations: SourceCodeLocation[],
  config?: SourceMapConfig,
  module?: WasmModule,
): SourceCodeLocation[] {
  if (config?.keepAllMappings !== undefined && config.keepAllMappings) {
    return sourceCodeLocations;
  }
  const [lineNrOffset, colNrOffset] = getOffsetToApply(config);
  const seenLocs = new Map<number, SourceCodeLocation[]>();
  const cleaned: SourceCodeLocation[] = [];
  for (const sl of sourceCodeLocations) {
    const cleanedSource = cleanSourcePath(sl.source, config);
    if (cleanedSource === undefined) {
      continue;
    }
    sl.source = cleanedSource;
    sl.colnr += colNrOffset;
    sl.linenr += lineNrOffset;
    sl.name = sl.name ?? '';

    if (
      module !== undefined &&
      module.instructionFromAddress(sl.address) === undefined
    ) {
      // we do not add mapping as there is no associated Wasm instruction
      continue;
    }

    const locs = seenLocs.get(sl.address);
    if (locs === undefined) {
      // first time encountering the source location
      // associated to address
      // add it to locations
      seenLocs.set(sl.address, [sl]);
      cleaned.push(sl);
    } else {
      // already encoutered the address
      // throw a warning if the source location is different
      const foundDifferent = locs.filter((l) => {
        return (
          l.colnr !== sl.colnr ||
          l.linenr !== sl.linenr ||
          l.source !== sl.source
        );
      });
      if (foundDifferent.length > 0) {
        const locsStrs = foundDifferent
          .map(sourceCodeLocationToString)
          .join(', ');
        logger.warn(
          `found Wasm address ${sl.address} that maps to #${foundDifferent.length} locations: ${locsStrs})`,
        );
        locs.push(sl);
        seenLocs.set(sl.address, locs);
      }
    }
  }

  return cleaned;
}

function cleanSources(sources: string[], config?: SourceMapConfig): string[] {
  if (config?.keepAllMappings !== undefined && config.keepAllMappings) {
    return sources;
  }
  const sourcesSeen = new Set<string>();
  const cleanedSources: string[] = [];
  for (const s of sources) {
    // avoid duplicates
    if (sourcesSeen.has(s)) {
      continue;
    }
    sourcesSeen.add(s);

    if (config === undefined) {
      cleanedSources.push(s);
      continue;
    }

    const cleaned = cleanSourcePath(s, config);
    if (cleaned !== undefined) {
      cleanedSources.push(cleaned);
    }
  }
  return cleanedSources;
}

function cleanSourcePath(
  source: string,
  config?: SourceMapConfig,
): string | undefined {
  if (config === undefined) {
    return source;
  }

  let cleanedSource = source;
  if (config.prefixSources !== undefined) {
    cleanedSource = pathJoin(config.prefixSources, source);
  }
  cleanedSource = config.srcToAbsPath?.get(cleanedSource) ?? cleanedSource;

  const ignore = config.ignore?.find((d) => cleanedSource.startsWith(d));
  if (ignore !== undefined) {
    // we do not add mapping as needs to be ignored
    return undefined;
  }

  // TODO this should only occurr if requested
  // because in SourceMap Class we do not remove those mappings
  // if sourcepath is not a filepath
  if (isFilePath(cleanedSource)) {
    return cleanedSource;
  } else {
    return undefined;
  }
}

function getOffsetToApply(config?: SourceMapConfig): [number, number] {
  if (config === undefined) {
    return [0, 0];
  }
  const colNrStartNumber = config.colNrStartNumber!;
  const lineNrStartNumber = config.lineNrStartNumber!;

  let colNrOffset = 0;
  if (colNrStartNumber > 1) {
    throw new Error(`We have a startColnr greater than 1 ${colNrStartNumber}`);
  } else if (colNrStartNumber === 0) {
    colNrOffset = 1;
  } else if (colNrStartNumber === 1) {
    colNrOffset = 0;
  } else {
    throw new Error(`We have a negative startColnr ${colNrStartNumber}`);
  }

  let lineNrOffset = 0;
  if (lineNrStartNumber > 1) {
    throw new Error(
      `We have a startLinenr greater than 1 ${lineNrStartNumber}`,
    );
  } else if (lineNrStartNumber === 0) {
    lineNrOffset = 1;
  } else if (lineNrStartNumber === 1) {
    lineNrOffset = 0;
  } else {
    throw new Error(`We have a negative startLineNr ${lineNrStartNumber}`);
  }

  return [lineNrOffset, colNrOffset];
}
