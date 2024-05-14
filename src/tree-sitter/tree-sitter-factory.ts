import * as fs from 'fs';
import type Parser from 'web-tree-sitter';
import { isFilePath, pathJoin } from '../util/file_util';
import { createLanguageParser } from './tree-sitter-parser';

function buildWasmParserName(targetLanguage: string): string {
  const d = __dirname;
  return pathJoin(d, `./parsers/tree-sitter-${targetLanguage}.wasm`);
}

function generateAvailableFiles(): string {
  const p = pathJoin(__dirname, `./parsers/`);
  const files = fs.readdirSync(p);
  const filesStr = files
    .map((f) => {
      return pathJoin(p, f);
    })
    .join(', ');

  return `[${filesStr}]`;
}

export async function buildASTParser(targetLanguage: string): Promise<Parser> {
  const tl = targetLanguage.toLowerCase();
  const pathToLanguageParser = buildWasmParserName(tl);
  if (!isFilePath(pathToLanguageParser)) {
    const avFiles = generateAvailableFiles();
    throw new Error(
      `No AST parser found for language ${tl}. Path to parser ${pathToLanguageParser}. Available files are ${avFiles}`,
    );
  }
  return createLanguageParser(pathToLanguageParser);
}

export async function createTypeScriptParser(): Promise<Parser> {
  return buildASTParser('typescript');
}

export async function createRustParser(): Promise<Parser> {
  return buildASTParser('rust');
}
