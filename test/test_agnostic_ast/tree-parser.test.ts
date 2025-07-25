import { expect } from 'chai';
import { buildASTParser } from '../../src/tree-sitter/tree-sitter-factory';
import assert from 'assert';
import { RustLangConfig } from '../../src/language_adaptors/languages/rust_config';
import { AssemblyScriptLangConfig } from '../../src/language_adaptors/languages/assemblyscript_config';
import { TreeParser } from '../../src/tree-sitter/tree-sitter-parser';

describe('Building Language Parsers', () => {
  it('Construct Parser for Rust', async () => {
    try {
      const parser = await buildASTParser(RustLangConfig.parserPath);
      expect(parser).to.not.equal(undefined);
    } catch (e) {
      assert.fail(`Could not construct parser for Rust. ${e}`);
    }
  });

  it('Construct Parser for TypeScript', async () => {
    try {
      const parser = await buildASTParser(AssemblyScriptLangConfig.parserPath);
      expect(parser).to.not.equal(undefined);
    } catch (e) {
      assert.fail(`Could not construct parser for Typescript. ${e}`);
    }
  });

  it('Construct Parser for unexisting language should throw error', async () => {
    let parser: TreeParser | undefined;
    try {
      parser = await buildASTParser('bloep');
      assert.fail(
        `Parser should have not been constructed. Got value of type ${typeof parser}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      expect(parser).to.equal(undefined);
    }
  });
});
