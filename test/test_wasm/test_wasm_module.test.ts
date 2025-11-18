import { fail } from 'assert';
import { expect } from 'chai';
import { pathJoin } from '../../src/util/file_util';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';

const rustExamplesPath = path.resolve('./test/data/rust/');
describe('WasmModule Parser', function () {
  const blinkApp = pathJoin(rustExamplesPath, 'blink_lambda/blink_lambda.wasm');
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
      expect(i.endAddress).to.not.equal(undefined);
    }
  });

  it('function 4 has 34 instructions', () => {
    const func = mod.getFunction(4);
    expect(func).to.not.equal(undefined);
    expect(func?.allInstructions.length).to.be.equal(35);
  });

  it('functions smallest address is start address first instruction', () => {
    for (const func of mod.functions) {
      expect(func.allInstructions).to.not.equal(0);
      const firstInstr = func.allInstructions[0];
      expect(firstInstr.startAddress).to.equal(func.startAddress);
    }
  });

  it('functions greatest address is end address last instruction', () => {
    for (const func of mod.functions) {
      const lastInstr = func.allInstructions[func.allInstructions.length - 1];
      expect(lastInstr.endAddress).to.equal(func.endAddress);
    }
  });
});
