import assert from 'assert';
import { expect } from 'chai';
import path from 'path';
import { pathJoin } from '../../src/util/file_util';
import { AgnosticAST } from '../../src/ast/angostic-ast';

const rustExamplesPath = path.resolve('./test/data/rust_examples/');

describe('Rust Blink App AST Building and Operations on AST', () => {
  const targetLanguage = 'rust';
  const blinkApp = pathJoin(rustExamplesPath, 'blink/main.rs');
  const blinkAST = new AgnosticAST(blinkApp, targetLanguage);

  before('Build Blink AST', async () => {
    try {
      await blinkAST.buildAST();
    } catch (e) {
      assert.fail(`Could not construct AST for source ${blinkApp}. ${e}`);
    }
  });

  it('Access inner AST should not yield an error', () => {
    try {
      expect(blinkAST.ast).to.not.equal(undefined);
    } catch (e) {
      assert.fail(`Test failed reason: ${e}`);
    }
  });
});
