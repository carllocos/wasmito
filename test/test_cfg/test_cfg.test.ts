import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import {
  WasmControlFlowGraph,
  buildControlFlowGraphFunction,
} from '../../src/cfg/wasm_cfg';

const exampleFile = path.resolve('./test/data/rust_examples/blink/main.wasm');
describe('Rust Language Adaptor for Blink App', function () {
  let mod: WasmModule;

  before('parse wasm module', () => {
    mod = new WasmModule(exampleFile);
  });

  it.skip('build cfg for module', () => {
    const g = new WasmControlFlowGraph(mod);
    const contents = g.serializeToDot();
    for (const [funId, dotContent] of contents) {
      expect(funId).to.greaterThan(mod.imports.length);
      expect(dotContent).to.not.equal('');
    }
  });

  it('build cfg function with id 7', function () {
    try {
      const graph = buildControlFlowGraphFunction(mod, 7);
      expect(graph.length).to.equal(2);
    } catch (e) {
      this.fail(`Building CFG for function 7 should be possible. Error ${e}`);
    }
  });
});
