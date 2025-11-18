import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmCFGs } from '../../src/cfg/wasm_cfg';
import { buildControlFlowGraphFunction } from '../../src/cfg/wasm_cfg_builder';

const appRoot = path.resolve('./test/data/rust/blink_lambda/');
const wasmPath = path.resolve(appRoot, 'blink_lambda.wasm');
describe('Rust Language Adaptor for Blink App', function () {
  let mod: WasmModule;

  before('parse wasm module', () => {
    mod = new WasmModule(wasmPath);
  });

  it('build cfg for module', () => {
    const g = new WasmCFGs(mod);
    const contents = g.serializeToDot(appRoot);
    expect(contents.length).to.greaterThan(mod.importFuncs.length);
    for (const dotContent of contents) {
      expect(dotContent).to.not.equal('');
    }
  });

  it('build cfg function with id 7', function () {
    try {
      const funGraph = buildControlFlowGraphFunction(mod, 7);
      expect(funGraph).to.not.equal(undefined);
      expect(funGraph.entryNode).to.not.equal(undefined);
      expect(funGraph.addrToNode).to.not.equal(undefined);
    } catch (e) {
      this.fail(`Building CFG for function 7 should be possible. Error ${e}`);
    }
  });
});
