import {
  DebugOperationName,
  type LanguageConfiguration,
} from './language_config';

export const AssemblyScriptLangConfig: LanguageConfiguration = {
  language: 'AssemblyScript',
  fileExtensions: ['ts', 'as'],
  parserPath: 'tree-sitter-typescript.wasm',
  astDebugOperations: [
    {
      astNodeDescription: {
        grammarID: 58,
        grammarType: 'new',
      },
      debugOperation: DebugOperationName.BreakOnInstanceCreation,
    },
  ],
};
