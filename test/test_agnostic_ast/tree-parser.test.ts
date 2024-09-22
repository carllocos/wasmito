import { expect } from 'chai';
import assert from 'assert';
import { getLangConfigFromExtension } from '../../src/language_adaptors/all_langs';
import { createASTLanguageParser } from '../../src/language_adaptors/tree-sitter-parser';

describe('Building Language Parsers', () => {
  it('Construct Parser for Rust', async () => {
    try {
      const rustLanguage = getLangConfigFromExtension('rs');
      assert(rustLanguage !== undefined);

      const parser = await createASTLanguageParser(rustLanguage.parserPath);
      expect(parser).to.not.equal(undefined);
    } catch (e) {
      assert.fail(`Could not construct parser for Rust. ${e}`);
    }
  });

  it('Construct Parser for TypeScript', async () => {
    try {
      const assemblyScriptLang = getLangConfigFromExtension('as');
      assert(assemblyScriptLang !== undefined);
      const parser = await createASTLanguageParser(
        assemblyScriptLang.parserPath,
      );
      expect(parser).to.not.equal(undefined);
    } catch (e) {
      assert.fail(`Could not construct parser for Typescript. ${e}`);
    }
  });

  it('Construct Parser for unexisting language should throw error', async () => {
    let parser: any;
    try {
      parser = await createASTLanguageParser('bloep');
      assert.fail(
        `Parser should have not been constructed. Got value of type ${typeof parser}`,
      );
    } catch (e) {
      expect(parser).to.equal(undefined);
    }
  });
});
