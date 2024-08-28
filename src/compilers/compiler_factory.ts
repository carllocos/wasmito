import { getGlobalLogger } from '../logger/logger';
import { AssemblyScriptCompiler } from './assemblyscript_compiler';
import { type SourceCodeCompiler } from './compiler';
import { DefaultCompiler } from './default_compiler';
import {
  TargetLanguage,
  isTargetLanguage,
  type ProgLangSelectionArgs,
} from './prog_language_selection';
import { WasmCompiler } from './wasm_compiler';
import { WATCompiler } from './wat_compilers';

export function makeSourceCodeCompiler(
  compilerSelection: ProgLangSelectionArgs, // may point to the source code or compiler configuration
  compilationOutput: string,
): SourceCodeCompiler {
  switch (compilerSelection.targetLanguage) {
    case TargetLanguage.WAT:
      return new WATCompiler(compilationOutput);
    case TargetLanguage.AssemblyScript:
      return new AssemblyScriptCompiler(compilationOutput);
    case TargetLanguage.Wasm:
      return new WasmCompiler(compilationOutput);
    default:
      if (isTargetLanguage(compilerSelection.targetLanguage)) {
        getGlobalLogger().info(
          `No compiler present for language with extension ${compilerSelection.targetLanguage} => deactivate compiler use`,
        );
        return new DefaultCompiler(
          compilerSelection.targetLanguage,
          compilationOutput,
        );
      } else {
        getGlobalLogger().error(
          'Did not found source code Compiler for language with extension',
          compilerSelection.targetLanguage,
          ` => deactivate compiler use`,
        );
        throw new Error('Unsupported source code extension');
      }
  }
}
