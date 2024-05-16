import assert from 'assert';
import { expect } from 'chai';
import path from 'path';
import { pathJoin } from '../../src/util/file_util';
import { AgnosticAST } from '../../src/ast/angostic-ast';
import {
  mostSpecialisedNode,
  sourceLocationToNodePosition as srcLocToASTPos,
} from '../../src/tree-sitter/tree-sitter-parser';

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

  it('MostSpecialisedNode of unexisting source location should yield undefined', () => {
    const noValidPos = srcLocToASTPos(45, 1);
    const foundNode = mostSpecialisedNode(blinkAST.ast, noValidPos);
    expect(foundNode).to.equal(undefined);
  });

  it('MostSpecialidNode on Source loc (45,5) should be the "const" of the declaration', () => {
    const ledDeclPos = srcLocToASTPos(45, 5);
    const n = mostSpecialisedNode(blinkAST.ast, ledDeclPos);
    expect(n).to.not.equal(undefined);
    expect(n?.text).to.equal('const');
  });

  it('MostSpecialisedNode on Source loc (45,22) should be the assigned "10" to the LED const', () => {
    const valueAssignedToLedDecl = srcLocToASTPos(45, 22);
    const n = mostSpecialisedNode(blinkAST.ast, valueAssignedToLedDecl);
    expect(n).to.not.equal(undefined);
    expect(n?.text).to.equal('10');
  });

  it('MostSpecialisedNode on Source loc (55,31) should be the "old_delta" parameter of the lambda', () => {
    const lambdaParameterLoc = srcLocToASTPos(55, 31);
    const n = mostSpecialisedNode(blinkAST.ast, lambdaParameterLoc);
    expect(n).to.not.equal(undefined);
    expect(n?.text).to.equal('old_delta');
  });
});
