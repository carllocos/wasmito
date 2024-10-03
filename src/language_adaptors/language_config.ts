import path from 'path';
import fs from 'fs';
import { isFilePath } from '../util/file_util';

const LanguagesJSONPath = path.join(
  path.resolve(__dirname),
  'languages',
  'languages.json',
);
const ASTParsersDirectory = path.join(
  path.resolve(__dirname),
  'languages',
  'ast_parsers',
);

const extensionToLanguage = new Map<string, ASTDebuggableLanguage>();
let languagesLoaded = false;

export interface ASTDebuggableLanguage {
  language: string;
  fileExtensions: string[];
  parserName: string;
  parserPath: string;
  astDebugOperations: ASTDebugOperation[];
}

export interface ASTDebuggableLanguages {
  languages: ASTDebuggableLanguage[];
}

export enum DebugOperationName {
  BreakOnInstanceCreation = 'BreakOnInstanceCreation',
}
export interface ASTNodeDescription {
  grammarID: number;
  grammarType: string;
}

export interface ASTDebugOperation {
  astNodeDescription: ASTNodeDescription;
  debugOperation: DebugOperationName;
}

export function getLangConfigFromExtension(
  ext: string,
): ASTDebuggableLanguage | undefined {
  const extensionToLanguage = readLanguagesJSON();
  return extensionToLanguage.get(ext);
}

function readLanguagesJSON(): Map<string, ASTDebuggableLanguage> {
  if (languagesLoaded) {
    return extensionToLanguage;
  }

  const jsonContent = fs.readFileSync(LanguagesJSONPath).toString();
  const obj = JSON.parse(jsonContent);

  const parsedLangauges = parseASTDebuggableLanguagesJSON(obj);
  for (const lang of parsedLangauges.languages) {
    for (const ext of lang.fileExtensions) {
      if (extensionToLanguage.has(ext)) {
        throw new Error(
          `More than one language found that uses extension ${ext}: language '${extensionToLanguage.get(ext)?.language}' and '${lang.language}'`,
        );
      }
      extensionToLanguage.set(ext, lang);
    }
  }

  languagesLoaded = true;
  return extensionToLanguage;
}

function stringToDebugOperationName(s: string): DebugOperationName {
  switch (s) {
    case DebugOperationName.BreakOnInstanceCreation:
      return DebugOperationName.BreakOnInstanceCreation;
    default:
      throw new Error(`No debug operation name found for '${s}'`);
  }
}

export function parseASTDebuggableLanguagesJSON(
  obj: any,
): ASTDebuggableLanguages {
  if (typeof obj !== 'object') {
    throw new Error(
      `Parsing 'ASTDebuggableLangauges' expects an object as argument. Given: ${obj}`,
    );
  }

  const languagesUnparsed = obj.languages;
  if (!Array.isArray(languagesUnparsed)) {
    throw new Error(
      `'languages' key is expected to be an array. Given: ${languagesUnparsed}`,
    );
  }
  const languages: ASTDebuggableLanguage[] = [];
  for (const l of languagesUnparsed) {
    languages.push(parseASTDebuggableLanguageJSON(l));
  }
  return {
    languages,
  };
}

export function parseASTDebuggableLanguageJSON(
  config: any,
): ASTDebuggableLanguage {
  if (typeof config !== 'object') {
    throw new Error(`ASTDebuggableJSON expected to be an object`);
  }

  const language = config.language;
  if (typeof language !== 'string' || language === '') {
    throw new Error(`'language' key is expected to be an non empty string`);
  }

  const fileExtensions = config.fileExtensions;
  if (
    !Array.isArray(fileExtensions) ||
    fileExtensions.find((e) => typeof e !== 'string') !== undefined
  ) {
    throw new Error(`'fileExtensions' is expected to be an array of strings`);
  }

  const parserName = config.parserName;
  if (typeof parserName !== 'string' || parserName === '') {
    throw new Error(`'parserName' key is expected to be an non empty string`);
  }
  const parserPath = path.join(ASTParsersDirectory, parserName);
  if (!isFilePath(parserPath)) {
    throw new Error(
      `Could not find a parser from 'parserName' ${parserName}. AST parser expected to be stored at ${ASTParsersDirectory}`,
    );
  }

  const astDebugOperations = parseASTDebugOperationJSON(
    config.astDebugOperations,
  );

  return {
    language,
    fileExtensions,
    parserPath,
    parserName,
    astDebugOperations,
  };
}

function parseASTDebugOperationJSON(
  astDbgOpsArrayJSON: any,
): ASTDebugOperation[] {
  if (!Array.isArray(astDbgOpsArrayJSON)) {
    throw new Error(
      `'astDebugOperations' is expected to be an array. Got: ${astDbgOpsArrayJSON}`,
    );
  }

  const ops: ASTDebugOperation[] = [];
  for (const opJSON of astDbgOpsArrayJSON) {
    const debugOperationStr = opJSON.debugOperation;
    if (typeof debugOperationStr !== 'string') {
      throw new Error(
        `'debugOperation' should be a string but got: ${debugOperationStr}`,
      );
    }

    const debugOperation = stringToDebugOperationName(debugOperationStr);
    const astNodeDescription = parseASTNodeDescriptionJSON(
      opJSON.astNodeDescription,
    );

    ops.push({
      debugOperation,
      astNodeDescription,
    });
  }
  return ops;
}

function parseASTNodeDescriptionJSON(obj: any): ASTNodeDescription {
  if (typeof obj !== 'object') {
    throw new Error(`ASTNodeDescription expected to be an object`);
  }

  const grammarID = obj.grammarID;
  if (typeof grammarID !== 'number') {
    throw new Error(`'grammarID' should be a number but got: ${grammarID}`);
  }

  const grammarType = obj.grammarType;
  if (typeof grammarType !== 'string') {
    throw new Error(`'grammarType' should be a string but got: ${grammarType}`);
  }
  return {
    grammarID,
    grammarType,
  };
}
