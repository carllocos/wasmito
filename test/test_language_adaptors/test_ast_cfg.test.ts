import path from 'path';
import { SourceMapFromJSON } from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import { type SourceCFGs } from '../../src/cfg/source_cfg';

const appRoot = path.resolve('./test/data/rust/blink_lambda/');
const mappingsPath = path.resolve(appRoot, 'mappings.json');
const wasmPath = path.resolve(appRoot, 'blink_lambda.wasm');
describe('Rust AST Control Flow Graph for Blink App', function () {
  let sourceCFGs: SourceCFGs;

  this.timeout(15000);

  before('parse wasm module', async function () {
    try {
      const sm = SourceMapFromJSON(mappingsPath, { newWasmPath: wasmPath });
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFGs = langAdaptor.sourceCFG;
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it.skip('build cfg function with id 7', function () {
    const startWasmAddr = 493; // Source Loc (44, 1)
    const node = sourceCFGs.nodesFromAddress(startWasmAddr);
    assert(node !== undefined);
  });
});
