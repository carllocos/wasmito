import { fail } from 'assert';
import { expect } from 'chai';
import { pathJoin } from '../../src/util/file_util';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';

const rustExamplesPath = path.resolve('./test/data/rust_examples/');
describe('WasmModule Parser', function () {
  const blinkApp = pathJoin(rustExamplesPath, 'blink/main.wasm');
  let mod: WasmModule;

  before('parse wasm module', () => {
    try {
      mod = new WasmModule(blinkApp);
      expect(mod).to.not.equal(undefined);
    } catch (e) {
      fail(`parsing module should not throw error. Error: ${e}`);
    }
    expect(mod.instructions).to.not.equal(0);
    for (const i of mod.instructions) {
      expect(i.startAddress).to.not.equal(undefined);
      expect(i.startAddress).to.not.equal(undefined);
    }
  });
});
