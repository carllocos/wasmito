import path from 'path';
import { SourceMapfromDWARFWasm } from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import { type SourceControlFlowGraph } from '../../src/cfg/source_cfg';

const exampleFile = path.resolve('./test/data/rust_examples/blink/main.wasm');
describe('Rust AST Control Flow Graph for Blink App', function () {
  let astCFG: SourceControlFlowGraph;

  this.timeout(15000);

  before('parse wasm module', async function () {
    try {
      const sm = await SourceMapfromDWARFWasm(exampleFile);
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      astCFG = langAdaptor.sourceCFG;
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it.skip('build cfg function with id 7', function () {
    const startWasmAddr = 493; // Source Loc (44, 1)
    const node = astCFG.nodesFromAddress(startWasmAddr);
    assert(node !== undefined);
  });
});
