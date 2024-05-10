import { expect } from 'chai';
import { addr2line } from '../../src/language_adaptors/dwarf/addr2lines';

/*
 * The following test suite is intented to test the generation of the sourcemap.
 * The generation of SourceMaps happens temporarily via the wasmt-tools addr2line command.
 * Until DWARF library is fully intergated
 */

describe('SourceMap builder', () => {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';

  it('Inspecting pc', async () => {
    const invalidWasmAddress = 0;
    const [exitCode, stdout, stderr] = await addr2line(
      wasmPath,
      invalidWasmAddress,
    );
    expect(exitCode).to.not.equal(0);
    expect(stdout).to.equal('');
    expect(stderr).to.not.equal('');
  });
});
