import type Parser from 'web-tree-sitter';
import { isFilePath, pathJoin } from '../util/file_util';
import { createLanguageParser } from './tree-sitter-parser';

function buildWasmParserName(parserName: string): string {
  const d = __dirname;
  return pathJoin(d, `./parsers/${parserName}`);
}

export async function buildASTParser(parserName: string): Promise<Parser> {
  const pathToLanguageParser = buildWasmParserName(parserName);
  if (!isFilePath(pathToLanguageParser)) {
    throw new Error(
      `No AST parser found with name ${parserName}. Path to parsers ${pathToLanguageParser}`,
    );
  }
  return createLanguageParser(pathToLanguageParser);
}
