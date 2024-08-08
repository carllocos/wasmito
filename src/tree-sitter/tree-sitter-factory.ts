import * as path from 'path';
import type Parser from 'web-tree-sitter';
import { isFilePath, listFilesInDirectory, pathJoin } from '../util/file_util';
import { createLanguageParser } from './tree-sitter-parser';

function parsersRootPath(): string {
  const d = path.resolve(__dirname);
  return pathJoin(d, `./parsers/`);
}

function buildWasmParserName(parserName: string): string {
  const p = parsersRootPath();
  return pathJoin(p, parserName);
}

export async function buildASTParser(parserName: string): Promise<Parser> {
  const pathToLanguageParser = buildWasmParserName(parserName);
  if (!isFilePath(pathToLanguageParser)) {
    let filesStr = 'failed to find';
    try {
      const files = await listFilesInDirectory(parsersRootPath());
      filesStr = files.join(', ');
    } catch (er) {
      filesStr = `failed to find with error ${er}`;
    }
    throw new Error(
      `No AST parser found with name ${parserName}. Path to parsers ${pathToLanguageParser}. Files found there: ${filesStr}`,
    );
  }
  return createLanguageParser(pathToLanguageParser);
}
