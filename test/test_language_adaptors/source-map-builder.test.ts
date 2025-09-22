import assert from 'assert';
import { expect } from 'chai';
import { type SourceMap } from '../../src/source_mappers/source_map';
import {
  DebugStandard,
  readSourceMap,
} from '../../src/source_mappers/source_map_builder';
import { createMappingForAddr } from '../../src/source_mappers/debug_standards/dwarf_reader';

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

describe('SourceMap building', function () {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';
  this.timeout(15000);

  it('building sourcemap', async function () {
    const mapping = await readSourceMap(
      DebugStandard.DWARF,
      wasmPath,
      wasmPath,
    );
    expect(mapping).not.equal(undefined);
  });
});

describe('SourceMap entries', function () {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';
  let sourceMap: SourceMap | undefined;
  this.timeout(15000);

  before('Build SourceMap', async function () {
    sourceMap = await readSourceMap(DebugStandard.DWARF, wasmPath, wasmPath);
    expect(sourceMap).to.not.equal(undefined);
  });

  it.skip('start wasmaddress has a mapping', () => {
    assert(sourceMap !== undefined);
    const startWasmAddress = 493;
    const mappings = sourceMap.getOriginalPositionFor(startWasmAddress);
    expect(mappings.length).to.not.equal(0);
    for (const loc of mappings) {
      expect(loc.linenr).to.equal(44);
    }
  });
});
