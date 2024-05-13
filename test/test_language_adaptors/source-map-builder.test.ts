import assert from 'assert';
import { expect } from 'chai';
import {
  SourceMapfromDWARFWasm,
  createMappingForAddr,
} from '../../src/source_mappers/source_map_builder';
import { type SourceMap } from '../../src/source_mappers/source_map';

/*
 * Until DWARF library is fully intergated, the generation of SourceMaps happens temporarily
 * via the `wasm-tools addr2line` command.
 * The following test suite tests the creation of such SourceMap
 */

describe('MappingItem building', () => {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';

  it('Invalid WasmAddr results in undefined mapping', async () => {
    const invalidWasmAddress = 1;
    const mapping = await createMappingForAddr(wasmPath, invalidWasmAddress);
    expect(mapping.length).equal(0);
  });

  it('Valid WasmAddr results in a mapping', async () => {
    const invalidWasmAddress = 289;
    const mapping = await createMappingForAddr(wasmPath, invalidWasmAddress);
    expect(mapping.length).not.equal(0);
  });
});

describe('SourceMap building', () => {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';

  it('building sourcemap', async function () {
    this.timeout(5000);
    const mapping = await SourceMapfromDWARFWasm(wasmPath);
    expect(mapping).not.equal(undefined);
  });
});

describe('SourceMap entries', () => {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';
  let sourceMap: SourceMap | undefined;
  before('Build SourceMap', async function () {
    this.timeout(10000);
    sourceMap = await SourceMapfromDWARFWasm(wasmPath);
    expect(sourceMap).to.not.equal(undefined);
  });

  it('start wasmaddress has a mapping', () => {
    assert(sourceMap !== undefined);
    const startWasmAddress = 486;
    const mappings = sourceMap.getOriginalPositionFor(startWasmAddress);
    expect(mappings.length).to.not.equal(0);
    for (const loc of mappings) {
      expect(loc.originalLine).to.equal(43);
    }
  });
});
