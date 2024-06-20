import { AssemblyScriptLangConfig } from './assemblyscript_config';
import { type LanguageConfiguration } from './language_config';

const LanguagesConfig = [AssemblyScriptLangConfig];

export function getLangConfigFromExtension(
  ext: string,
): LanguageConfiguration | undefined {
  // TODO speed up by computing a map of ext to langs
  const langs = LanguagesConfig.filter((l) => {
    const found = l.fileExtensions.find((ex) => {
      return ex === ext;
    });
    return found !== undefined;
  });

  if (langs.length > 1) {
    const langsStr = langs.map((l) => l.language).join(', ');
    throw new Error(
      `More than one language found that uses extension ${ext}:${langsStr}`,
    );
  } else if (langs.length === 1) {
    return langs[0];
  } else {
    return undefined;
  }
}
