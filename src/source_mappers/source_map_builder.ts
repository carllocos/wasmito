import fs from 'fs';
import { SourceMap } from './source_map';
import { type MappingItem, SourceMapConsumer } from 'source-map';
import { createLogger } from '../logger/logger';
import { addr2line } from '../wasm-tools/addr2lines';
import { wasmToolsObjdump } from '../wasm-tools/objdump';
import { getProducer } from '../wasm-tools/metadata_wasm';

const logger = createLogger('SourceMapBuilder');

export interface SourceOffsetStart {
  colNrStartNumber: number;
  lineNrStartNumber: number;
}

export async function SourceMapfromSourceMapSpec(
  pathToSourceMap: string,
  wasmPath: string,
  targetLanguage: string,
  startPositioning: SourceOffsetStart,
  absPathMapper?: Map<string, string>,
): Promise<SourceMap> {
  const content = await fs.promises.readFile(pathToSourceMap);
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

  let cleanedMappings = mappings.filter((m: MappingItem) => {
    const hasOriginalLine =
      m.originalLine !== undefined && m.originalLine !== null;
    const hasOriginalColumnNr =
      m.originalColumn !== undefined && m.originalColumn !== null;
    return hasOriginalLine && hasOriginalColumnNr;
  });
  if (mappings.length !== cleanedMappings.length) {
    logger.debug(
      `We removed ${mappings.length - cleanedMappings.length} entries from the sourcemap as it has no originalLineNr nor originalColumnNr`,
    );
  }

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
  cleanedMappings = cleanedMappings.map((m: MappingItem) => {
    // case where either source, line number, column nr, is not avaialable should not occur
    // throw error just in case
    if (m.originalLine === undefined || m.originalColumn === undefined) {
      throw new Error(`Found an empty originalLine nr for mapping`);
    }

    if (m.originalColumn === undefined || m.originalColumn === undefined) {
      throw new Error(`Found an empty originalColumn nr for mapping`);
    }

    if (m.source === undefined || m.source === undefined) {
      throw new Error(`Found an empty source for mapping`);
    }

    if (m.name === undefined || m.name === null) {
      m.name = '';
    }
    m.originalColumn += colNrOffset;
    m.originalLine += lineNrOffset;
    return m;
  });

  const cleanedSources: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    const cleanedSource = absPathMapper?.get(sources[i]);
    if (cleanedSource !== undefined) {
      cleanedSources.push(cleanedSource);
    } else {
      cleanedSources.push(sources[i]);
    }
  }

  const sm = new SourceMap(
    targetLanguage,
    wasmPath,
    cleanedSources,
    cleanedMappings,
    absPathMapper ?? new Map(),
  );
  return sm;
}

export async function SourceMapfromDWARFWasm(
  wasmFilePath: string,
): Promise<SourceMap> {
  const targetLanguage = await getProducer(wasmFilePath);
  const wasmAddresses = await getAddressRangeOffset(wasmFilePath);
  const mappingsResults = await Promise.all(
    wasmAddresses.map(async (addr: number) => {
      return createMappingForAddr(wasmFilePath, addr);
    }),
  );

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

  return new SourceMap(targetLanguage, wasmFilePath, sources, mappings);
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
