import fs from 'fs';
import { isAbsolutePath, isFilePath, pathJoin } from '../util/file_util';
import { SourceMap } from './source_map';
import { type MappingItem, SourceMapConsumer } from 'source-map';
import { createLogger } from '../logger/logger';
import { addr2line } from '../wasm-tools/addr2lines';
import { wasmToolsObjdump } from '../wasm-tools/objdump';
import { getProducer } from '../wasm-tools/metadata_wasm';

const logger = createLogger('SourceMapBuilder');

export async function SourceMapfromSourceMapSpec(
  pathToRootSource: string,
  pathToSourceMap: string,
  wasmPath: string,
): Promise<SourceMap> {
  const content = await fs.promises.readFile(pathToSourceMap);
  const sourceMapStr = JSON.parse(content.toString());
  const [sources, mappings, srcRoot] = await SourceMapConsumer.with(
    sourceMapStr,
    null,
    (consumer) => {
      const mps: MappingItem[] = [];
      consumer.eachMapping((mapping: MappingItem) => {
        mps.push(mapping);
      });
      const c = consumer as any; // TODO sourceRoot update types info
      const sourceRoot = c.sourceRoot;
      return [consumer.sources, mps, sourceRoot];
    },
  );

  const sourceRoot = typeof srcRoot === 'string' ? srcRoot : pathToRootSource;

  const cleanedMappings = mappings.filter((m: MappingItem) => {
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

  cleanedMappings.forEach((m: MappingItem) => {
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
  });

  const sourcesAbsPath: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    if (source.startsWith(sourceRoot)) {
      logger.debug(
        `Removing sourceRoot '${sourceRoot}' from AssemblyScript source '${source}'`,
      );
      source = source.slice(sourceRoot.length + 1, source.length);
    }

    if (!isAbsolutePath(source)) {
      logger.debug(`Creating absolute path for source '${source}`);
      source = pathJoin(sourceRoot, source);
    }
    if (isFilePath(source)) {
      sourcesAbsPath.push(source);
    } else {
      logger.warn(
        `Ignoring source '${source}' for source maps as such file does not exist`,
      );
    }
  }

  if (sourcesAbsPath.length === 0) {
    throw new Error(
      `No source found in the sourcemap that satifies the conditions. All sources  ${sources.join(
        ', ',
      )}`,
    );
  }

  const sm = new SourceMap(
    'TODO',
    pathToSourceMap,
    wasmPath,
    sourcesAbsPath,
    sources,
    cleanedMappings,
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

  const pathToSourceMap = ''; // no path to sourceMapSpec

  // convert to set to remove duplicates
  const sources = Array.from(new Set(mappings.map((m) => m.source)));

  return new SourceMap(
    targetLanguage,
    pathToSourceMap,
    wasmFilePath,
    sources,
    sources,
    mappings,
  );
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
