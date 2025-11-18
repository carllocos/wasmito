import assert from 'assert';
import { expect } from 'chai';
import path from 'path';
import { pathJoin } from '../../src/util/file_util';
import { AgnosticAST } from '../../src/ast/angostic-ast';
import { sourceLocationToNodePosition } from '../../src/tree-sitter/tree-sitter-parser';
import { RustLangConfig } from '../../src/language_adaptors/languages/rust_config';

const rustExamplesPath = path.resolve('./test/data/rust/');

describe('Rust Blink App AST Building and Operations on AST', () => {
  const blinkApp = pathJoin(rustExamplesPath, 'blink_lambda/blink_lambda.rs');
  const blinkAST = new AgnosticAST(blinkApp, RustLangConfig);

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
    const validLineNr = 45;
    const invalidColNr = 1;
    const foundNode = blinkAST.mostSpecialisedNode(validLineNr, invalidColNr);
    expect(foundNode).to.equal(undefined);
  });

  it('MostSpecialidNode on Source loc (45,5) should be the "const" of the declaration', () => {
    const n = blinkAST.mostSpecialisedNode(45, 5);
    expect(n?.text).to.equal('const');
    expect(n?.childCount).equal(0);
  });

  it('MostSpecialisedNode on Source loc (45,22) should be the assigned "10" to the LED const', () => {
    const n = blinkAST.mostSpecialisedNode(45, 22);
    expect(n?.text).to.equal('10');
    expect(n?.childCount).equal(0);
  });

  it('MostSpecialisedNode on Source loc (55,31) should be the "old_delta" parameter of the lambda', () => {
    const n = blinkAST.mostSpecialisedNode(55, 31);
    expect(n?.text).to.equal('old_delta');
    expect(n?.childCount).equal(0);
  });

  it('NextNode for Source loc (45,22) should be the the ";" at the end of the line', () => {
    const n = blinkAST.nextNode(45, 22);
    expect(n?.text).equal(';');
    const expectedPos = sourceLocationToNodePosition(45, 24);
    expect(n?.startPosition.row).equal(expectedPos.row);
    expect(n?.startPosition.column).equal(expectedPos.col);
  });

  it('NextNode for Source loc (45,24) should be the the "const" at source loc (46,5)', () => {
    const n = blinkAST.nextNode(45, 24);
    expect(n?.text).equal('const');
    const expectedPos = sourceLocationToNodePosition(46, 5);
    expect(n?.startPosition.row).equal(expectedPos.row);
    expect(n?.startPosition.column).equal(expectedPos.col);
  });

  it('NextNode for Source loc (52,19) should be the the "," at source loc (52,21)', () => {
    const n = blinkAST.nextNode(52, 19);
    expect(n?.text).equal(',');
    const expectedPos = sourceLocationToNodePosition(52, 21);
    expect(n?.startPosition.row).equal(expectedPos.row);
    expect(n?.startPosition.column).equal(expectedPos.col);
  });
});
