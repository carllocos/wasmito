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
        grammarType: 'new',
      },
      debugOperation: DebugOperationName.BreakOnInstanceCreation,
    },
  ],
};
