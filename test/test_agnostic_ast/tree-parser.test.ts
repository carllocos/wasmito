import { expect } from 'chai';
import { buildASTParser } from '../../src/tree-sitter/tree-sitter-factory';
import assert from 'assert';

describe('Building Language Parsers', () => {
  it('Construct Parser for Rust', async () => {
    try {
      const parser = await buildASTParser('rust');
      expect(parser).to.not.equal(undefined);
    } catch (e) {
      assert.fail(`Could not construct parser for Rust. ${e}`);
    }
  });

  it('Construct Parser for TypeScript', async () => {
    try {
      const parser = await buildASTParser('typescript');
      expect(parser).to.not.equal(undefined);
    } catch (e) {
      assert.fail(`Could not construct parser for Typescript. ${e}`);
    }
  });

  it('Construct Parser for unexisting language should throw error', async () => {
    let parser: any;
    try {
      parser = await buildASTParser('bloep');
      assert.fail(
        `Parser should have not been constructed. Got value of type ${typeof parser}`,
      );
    } catch (e) {
      expect(parser).to.equal(undefined);
    }
  });
});
