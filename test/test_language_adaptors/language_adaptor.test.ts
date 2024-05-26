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
import { DebugAgnosticOperations } from '../../src/language_adaptors/debug_tree_operations';

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

  it('Step over debug operation', () => {
    const startWasmAddr = 493; // Source Loc (44, 1)
    const node = AgnosticNodeFromWasmAddress(
      langAdaptor.sourceMap,
      langAdaptor.asts,
      startWasmAddr,
    );
    assert(node !== undefined);
    let nextNode = DebugAgnosticOperations.stepOver(langAdaptor, node);
    assert(nextNode !== undefined);
    expect(nextNode.node.text).to.equal('pin_mode_lib');
    nextNode = DebugAgnosticOperations.stepOver(langAdaptor, nextNode);
    assert(nextNode !== undefined);
    expect(nextNode.node.text).to.equal('2');
    nextNode = DebugAgnosticOperations.stepOver(langAdaptor, nextNode);
    assert(nextNode !== undefined);
    expect(nextNode.node.text).to.equal('loop');
  });
});
