import {
  SourceCodeLocation,
  SourceMap,
  type SourceMapJSON,
} from '../source_map';
import { Module } from 'wasmito-tools';
import { readFileSync } from 'fs';
import { WasmModule } from '../../webassembly/wasm/wasm_module';

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
  const buffer = readFileSync(wasmFilePath);
  const wasm = new Module(buffer);
  const mappings: SourceCodeLocation[] = [];
  const sources = new Set<string>();
  const parsedModule = new WasmModule(wasmFilePath);
  for (const inst of parsedModule.instructions) {
    const addr = inst.startAddress;

    try {
      const m = wasm.addr2line(BigInt(addr));
      const source = m.file;
      const linenr = m.line;
      const colnr = m.column ?? 0;
      if (source === undefined) continue;
      if (linenr === undefined) continue;

      mappings.push({
        source,
        linenr,
        colnr,
        address: addr,
        name: '',
      });

      sources.add(source);
    } catch (_error) {
      continue;
    }
  }

  if (mappings.length === 0) {
    throw new Error(`No mapping found for the given wasmFile ${wasmFilePath}`);
  }

  return {
    wasm: wasmFilePath,
    sources: Array.from(sources),
    mappings,
  };
}
