import { expect } from 'chai';
import { addr2line } from '../../src/dwarf/addr2lines';

/*
 * Until DWARF library is fully intergated, the generation of SourceMaps happens temporarily
 * via the `wasm-tools addr2line` command.
 * The following test suite tests the `wasm-tools addr2line command`
 */

describe('addr2line command', () => {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';

  it('Invalid WasmAddr yields an empty array result', async () => {
    const invalidWasmAddress = 0;
    const decodedLine = await addr2line(wasmPath, invalidWasmAddress);
    expect(decodedLine.length).equal(0);
  });

  it('Valid WasmAddr yields a non empty array result', async () => {
    const invalidWasmAddress = 289;
    const decodedLine = await addr2line(wasmPath, invalidWasmAddress);
    expect(decodedLine.length).to.not.equal(0);
  });
});
