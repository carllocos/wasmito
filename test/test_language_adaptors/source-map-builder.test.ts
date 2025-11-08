import assert from 'assert';
import { expect } from 'chai';
import { type SourceMap } from '../../src/source_mappers/source_map';
import { SourceMapFromJSON } from '../../src/source_mappers/source_map_builder';

/*
 * Until DWARF library is fully intergated, the generation of SourceMaps happens temporarily
 * via the `wasm-tools addr2line` command.
 * The following test suite tests the creation of such SourceMap
 */

describe('SourceMap building', function () {
  const mappingsPath = './test/data/rust_examples/blink/mappings.json';
  this.timeout(15000);

  it('building sourcemap', async function () {
    const mapping = SourceMapFromJSON(mappingsPath);
    expect(mapping).not.equal(undefined);
  });
});

describe('SourceMap entries', function () {
  const mappingsPath = './test/data/rust_examples/blink/mappings.json';
  let sourceMap: SourceMap | undefined;
  this.timeout(15000);

  before('Build SourceMap', async function () {
    sourceMap = SourceMapFromJSON(mappingsPath);
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
