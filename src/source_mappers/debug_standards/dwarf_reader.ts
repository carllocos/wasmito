import {
  SourceMap,
  type SourceMapJSON,
  mappingItemToSourceCodeLocation,
} from '../source_map';
import { type MappingItem } from 'source-map';
// import { createLogger } from '../../logger/logger';
import { addr2line } from '../../wasm-tools/addr2lines';
import { wasmToolsObjdump } from '../../wasm-tools/objdump';
// const logger = createLogger('DWARFSourceMapBuilder');

// Who uses this function?
export async function SourceMapfromDWARFWasm(
  wasmFilePath: string,
): Promise<SourceMap> {
  const read = await ReadDWARFMappings(wasmFilePath);
  return new SourceMap(wasmFilePath, read.sources, read.mappings);
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

  return {
    wasm: wasmFilePath,
    sources: Array.from(new Set(mappings.map((m) => m.source))),
    mappings: mappings.map(mappingItemToSourceCodeLocation),
  };
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
