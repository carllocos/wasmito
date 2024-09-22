import fs from 'fs';
import {
  type ASTDebuggableLanguage,
  LanguagesJSONPath,
  parseASTDebuggableLanguagesJSON,
} from './language_config';

const extensionToLanguage = new Map<string, ASTDebuggableLanguage>();
let languagesLoaded = false;

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
