import fs from 'fs';
import {
  type SourceCodeLocation,
  SourceMap,
  type SourceMapJSON,
  isSourceMapJSON,
  mappingItemToSourceCodeLocation,
  sourceCodeLocationToString,
} from './source_map';
import { type MappingItem, SourceMapConsumer } from 'source-map';
import { createLogger } from '../logger/logger';
import { addr2line } from '../wasm-tools/addr2lines';
import { wasmToolsObjdump } from '../wasm-tools/objdump';
import { isFilePath, pathJoin, readFileAsJSON } from '../util/file_util';

const logger = createLogger('SourceMapBuilder');

export interface SourceOffsetStart {
  colNrStartNumber: number;
  lineNrStartNumber: number;
}

export const DefaultSourceOffsetStart: SourceOffsetStart = {
  colNrStartNumber: 0,
  lineNrStartNumber: 1,
};

export interface SourceMapConfig {
  srcToAbsPath?: Map<string, string>;
  ignoreDirectories?: string[];
  prefixSources?: string;
}

export async function readSourceMapConfig(
  jsonPath: string,
): Promise<SourceMapConfig> {
  const rebase = await readFileAsJSON(jsonPath);

  const config: SourceMapConfig = {};
  config.srcToAbsPath = new Map<string, string>();
  const pathsAr = rebase.absolutePaths ?? [];
  if (Array.isArray(pathsAr)) {
    for (let i = 0; i < pathsAr.length; i++) {
      const pathMap = pathsAr[i];
      if (!Array.isArray(pathMap) || pathMap.length !== 2) {
        throw new Error('SourceMapConfig: A filepath map requires 2 values');
      } else {
        const [p1, p2] = pathMap;
        if (typeof p1 !== 'string' || typeof p2 !== 'string') {
          throw new Error(
            'SourceMapConfig: Filepaths are supposed to be strings',
          );
        }
        config.srcToAbsPath.set(p1, p2);
      }
    }
  }

  if (rebase.prefixSources !== undefined) {
    const prefixSources = rebase.prefixSources;
    if (typeof prefixSources !== 'string') {
      throw new Error(
        'SourceMapConfig: `prefixSources` is expected to be a string',
      );
    }
    config.prefixSources = prefixSources;
  }

  if (Array.isArray(rebase.ignoreDirectories)) {
    const ignoreDirs = [];
    for (const ignore of rebase.ignoreDirectories) {
      if (typeof ignore !== 'string') {
        throw new Error(
          'SourceMapConfig: Ignore Directory is expected to be a string',
        );
      }
      ignoreDirs.push(ignore);
    }
    config.ignoreDirectories = ignoreDirs;
  }

  return config;
}

function getOffsetToApply(
  startPositioning: SourceOffsetStart,
): [number, number] {
  let colNrOffset = 0;
  if (startPositioning.colNrStartNumber > 1) {
    throw new Error(
      `We have a startColnr greater than 1 ${startPositioning.colNrStartNumber}`,
    );
  } else if (startPositioning.colNrStartNumber === 0) {
    colNrOffset = 1;
  } else if (startPositioning.colNrStartNumber === 1) {
    colNrOffset = 0;
  } else {
    throw new Error(
      `We have a negative startColnr ${startPositioning.colNrStartNumber}`,
    );
  }

  let lineNrOffset = 0;
  if (startPositioning.lineNrStartNumber > 1) {
    throw new Error(
      `We have a startLinenr greater than 1 ${startPositioning.lineNrStartNumber}`,
    );
  } else if (startPositioning.lineNrStartNumber === 0) {
    lineNrOffset = 1;
  } else if (startPositioning.lineNrStartNumber === 1) {
    lineNrOffset = 0;
  } else {
    throw new Error(
      `We have a negative startLineNr ${startPositioning.lineNrStartNumber}`,
    );
  }

  return [lineNrOffset, colNrOffset];
}

export async function SourceMapFromSourceMapSpec(
  pathToSourceMap: string,
  wasmPath: string,
  startPositioning: SourceOffsetStart,
  config?: SourceMapConfig,
): Promise<SourceMap> {
  const m = await ReadSourceSpec(
    pathToSourceMap,
    wasmPath,
    startPositioning,
    config,
  );
  const sm = new SourceMap(m.wasm, m.sources, m.mappings, config);
  return sm;
}

export async function SourceMapfromDWARFWasm(
  wasmFilePath: string,
): Promise<SourceMap> {
  const read = await ReadDWARFMappings(wasmFilePath);
  return new SourceMap(wasmFilePath, read.sources, read.mappings);
}

export async function SourceMapFromJSON(
  jsonPath: string | SourceMapJSON,
): Promise<SourceMap> {
  let sm: SourceMapJSON | undefined = undefined;
  if (typeof jsonPath === 'string') {
    const content = await readFileAsJSON(jsonPath);
    if (!isSourceMapJSON(content)) {
      throw new Error(
        `${jsonPath} does not satisfy the expected SourceMapJSON interface`,
      );
    }
    sm = content;
  } else {
    sm = jsonPath;
  }

  return new SourceMap(sm.wasm, sm.sources, sm.mappings);
}

export async function createMappingForAddr(
  wasmFilePath: string,
  addr: number,
): Promise<MappingItem[]> {
  const output = await addr2line(wasmFilePath, addr);
  return output.map((l) => {
    const generatedLine = 0;
    return {
      source: l.sourceFile,
      generatedLine,
      generatedColumn: l.address,
      originalColumn: l.colnr,
      originalLine: l.linenr,
      name: l.name,
    };
  });
}

async function getAddressRangeOffset(wasmFilePath: string): Promise<number[]> {
  const objDump = await wasmToolsObjdump(wasmFilePath);
  const codeSection = objDump?.find(
    (dumpLine) => dumpLine.sectionName === 'code',
  );
  if (codeSection === undefined) {
    if (objDump === undefined) {
      throw new Error(`Objdump failed on file '${wasmFilePath}'`);
    } else {
      throw new Error(`No code section found in Objdump'`);
    }
  }
  const startAddr = codeSection.startWasmAddress;
  const endAddr = codeSection.endWasmAddress;
  const wasmAddresses: number[] = [];
  for (let addr = startAddr; addr <= endAddr; addr++) {
    wasmAddresses.push(addr);
  }
  return wasmAddresses;
}

export async function ReadDWARFMappings(
  wasmFilePath: string,
): Promise<SourceMapJSON> {
  const wasmAddresses = await getAddressRangeOffset(wasmFilePath);
  const mappingsResults: MappingItem[][] = [];
  for (const addr of wasmAddresses) {
    const m = await createMappingForAddr(wasmFilePath, addr);
    if (m.length > 0) {
      mappingsResults.push(m);
    }
  }

  let mappings: MappingItem[] = [];
  for (const m of mappingsResults) {
    if (m !== undefined) {
      mappings = mappings.concat(m);
    }
  }

  if (mappings.length === 0) {
    throw new Error(`No mapping found for the given wasmFile ${wasmFilePath}`);
  }

  // convert to set to remove duplicates
  const sources = Array.from(new Set(mappings.map((m) => m.source)));
  const sourceLocations = mappings.map(mappingItemToSourceCodeLocation);

  return {
    wasm: wasmFilePath,
    sources,
    mappings: sourceLocations,
  };
}

export async function ReadSourceSpec(
  pathToSourceSpec: string,
  wasmPath: string,
  startPositioning: SourceOffsetStart,
  config?: SourceMapConfig,
): Promise<SourceMapJSON> {
  const content = await fs.promises.readFile(pathToSourceSpec);
  const sourceMapStr = JSON.parse(content.toString());
  const [sources, mappings] = await SourceMapConsumer.with(
    sourceMapStr,
    null,
    (consumer) => {
      const mps: MappingItem[] = [];
      consumer.eachMapping((mapping: MappingItem) => {
        mps.push(mapping);
      });
      return [consumer.sources, mps];
    },
  );

  const sourceLocs = mappings
    .filter((m: MappingItem) => {
      const hasOriginalLine =
        m.originalLine !== undefined && m.originalLine !== null;
      const hasOriginalColumnNr =
        m.originalColumn !== undefined && m.originalColumn !== null;
      return hasOriginalLine && hasOriginalColumnNr;
    })
    .map(mappingItemToSourceCodeLocation);

  return {
    wasm: wasmPath,
    sources: cleanSources(sources, config),
    mappings: cleanMappings(sourceLocs, startPositioning, config),
  };
}

function cleanMappings(
  sourceCodeLocations: SourceCodeLocation[],
  startPositioning?: SourceOffsetStart,
  config?: SourceMapConfig,
): SourceCodeLocation[] {
  const [lineNrOffset, colNrOffset] =
    startPositioning === undefined
      ? [0, 0]
      : getOffsetToApply(startPositioning);

  const seenLocs = new Map<number, SourceCodeLocation[]>();
  const cleaned: SourceCodeLocation[] = [];
  for (const sl of sourceCodeLocations) {
    sl.colnr += colNrOffset;
    sl.linenr += lineNrOffset;
    sl.name = sl.name ?? '';
    sl.source = cleanSource(sl.source, config);

    if (config?.ignoreDirectories !== undefined) {
      const found = config.ignoreDirectories.find((dir) => {
        return sl.source.startsWith(dir);
      });
      if (found !== undefined) {
        // we do not add mapping as needs to be ignored
        continue;
      }
    }

    const locs = seenLocs.get(sl.address);
    if (locs === undefined) {
      seenLocs.set(sl.address, [sl]);
    } else {
      const foundDifferent = locs.filter((l) => {
        return (
          l.colnr !== sl.colnr ||
          l.linenr !== sl.linenr ||
          l.source === sl.source
        );
      });
      if (foundDifferent.length > 0) {
        const locsStrs = foundDifferent
          .map(sourceCodeLocationToString)
          .join(', ');
        logger.warn(
          `found Wasm address ${sl.address} that maps to #${foundDifferent.length} locations: ${locsStrs})}}`,
        );
      }
    }

    cleaned.push(sl);
  }

  if (sourceCodeLocations.length !== cleaned.length) {
    logger.debug(
      `We removed ${sourceCodeLocations.length - cleaned.length} entries from the sourcemap as it has no originalLineNr nor originalColumnNr`,
    );
  }

  return cleaned;
}

function cleanSources(sources: string[], config?: SourceMapConfig): string[] {
  const ignoreDirs = config?.ignoreDirectories ?? [];
  const ignored = sources.filter((s) => {
    return ignoreDirs.find((d) => s.startsWith(d)) === undefined;
  });
  return ignored.map((s) => cleanSource(s, config));
}

function cleanSource(source: string, config?: SourceMapConfig): string {
  if (config === undefined) {
    return source;
  }

  let newSource = source;
  if (config.prefixSources !== undefined) {
    newSource = pathJoin(config.prefixSources, source);
  } else if (config.srcToAbsPath !== undefined) {
    newSource = config.srcToAbsPath?.get(source) ?? source;
  }
  return isFilePath(newSource) ? newSource : source;
}
