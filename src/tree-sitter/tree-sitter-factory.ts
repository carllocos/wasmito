import type Parser from 'web-tree-sitter';
import { isFilePath, pathJoin } from '../util/file_util';
import { createLanguageParser } from './tree-sitter-parser';

function buildWasmParserName(targetLanguage: string): string {
  const d = __dirname;
  return pathJoin(d, `./parsers/tree-sitter-${targetLanguage}.wasm`);
}

export async function buildASTParser(targetLanguage: string): Promise<Parser> {
  const pathToLanguageParser = buildWasmParserName(targetLanguage);
  if (isFilePath(pathToLanguageParser)) {
    throw new Error(`No AST parser found for language ${targetLanguage}`);
  }
  return createLanguageParser(pathToLanguageParser);
}

export async function createTypeScriptParser(): Promise<Parser> {
  return buildASTParser('typescript');
}

export async function createRustParser(): Promise<Parser> {
  return buildASTParser('rust');
}
