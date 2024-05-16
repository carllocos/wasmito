import assert from 'assert';
import { expect } from 'chai';
import path from 'path';
import { pathJoin } from '../../src/util/file_util';
import {
  constructLanguageAdaptor,
  type LanguageAdaptor,
} from '../../src/language_adaptors/language_adaptor';
import { SourceMapfromDWARFWasm } from '../../src/source_mappers/source_map_builder';
import { AgnosticNodeFromWasmAddress } from '../../src/language_adaptors/agnostic_node';

const rustExamplesPath = path.resolve('./test/data/rust_examples/');

describe('Rust Language Adaptor for Blink App', function () {
  const blinkApp = pathJoin(rustExamplesPath, 'blink/main.wasm');
  let langAdaptor: LanguageAdaptor;
  this.timeout(25000);

  before('Build Language Adaptor', async () => {
    try {
      const sourceMap = await SourceMapfromDWARFWasm(blinkApp);
      langAdaptor = await constructLanguageAdaptor(sourceMap);
    } catch (e) {
      assert.fail(`Could not construct language Adaptor for ${blinkApp}. ${e}`);
    }
  });

  it('MostSpecialisedNode of unexisting source location should yield undefined', () => {
    const startWasmAddr = 493;
    const node = AgnosticNodeFromWasmAddress(
      langAdaptor.sourceMap,
      langAdaptor.asts,
      startWasmAddr,
    );
    expect(node).to.not.equal(undefined);
  });
});
