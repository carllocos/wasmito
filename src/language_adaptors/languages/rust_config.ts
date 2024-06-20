import { type LanguageConfiguration } from './language_config';

export const RustLangConfig: LanguageConfiguration = {
  language: 'rust',
  fileExtensions: ['rs'],
  parserPath: 'tree-sitter-rust.wasm',
};
