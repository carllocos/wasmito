import { expect } from 'chai';
import { addr2line } from '../../src/dwarf/addr2lines';

/*
 * Until DWARF library is fully intergated, the generation of SourceMaps happens temporarily
 * via the `wasm-tools addr2line` command.
 * The following test suite tests the `wasm-tools addr2line command`
 */

describe('addr2line command', () => {
  const wasmPath = './test/data/rust_examples/blink/main.wasm';

  it('Invalid WasmAddr yields non-zero exitCode', async () => {
    const invalidWasmAddress = 0;
    const [exitCode, stdout, stderr] = await addr2line(
      wasmPath,
      invalidWasmAddress,
    );
    expect(exitCode).to.not.equal(0);
    expect(stdout).to.equal('');
    expect(stderr).to.not.equal('');
  });

  it('Valid WasmAddr yields zero exitCode, empty stderr, and non-empty stdout', async () => {
    const invalidWasmAddress = 289;
    const [exitCode, stdout, stderr] = await addr2line(
      wasmPath,
      invalidWasmAddress,
    );
    expect(exitCode).to.equal(0);
    expect(stdout).to.not.equal('');
    expect(stderr).to.equal('');
  });
});
