import { expect } from 'chai';
import {
  buildSourceMap,
  createMappingForAddr,
} from '../../src/language_adaptors/dwarf/addr2lines';

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
    expect(mapping).equal(undefined);
  });

  it('Valid WasmAddr results in a mapping', async () => {
    const invalidWasmAddress = 289;
    const mapping = await createMappingForAddr(wasmPath, invalidWasmAddress);
    expect(mapping).not.equal(undefined);
  });
});

describe('SourceMap building', () => {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';

  it('building sourcemap', async function () {
    this.timeout(5000);
    const mapping = await buildSourceMap(wasmPath);
    expect(mapping).not.equal(undefined);
    expect(mapping.factory).equal('Rust');
    expect(mapping.mappings.length).not.equal(0);
  });
});
