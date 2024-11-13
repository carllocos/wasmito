import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmControlFlowGraph } from '../../src/cfg/wasm_cfg';
import { buildControlFlowGraphFunction } from '../../src/cfg/wasm_cfg_builder';

const exampleFile = path.resolve('./test/data/rust_examples/blink/main.wasm');
describe('Rust Language Adaptor for Blink App', function () {
  let mod: WasmModule;

  before('parse wasm module', () => {
    mod = new WasmModule(exampleFile);
  });

  it('build cfg for module', () => {
    const outputDir = path.resolve('./test/data/rust_examples/blink');
    const g = new WasmControlFlowGraph(mod);
    const contents = g.serializeToDot(outputDir);
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
