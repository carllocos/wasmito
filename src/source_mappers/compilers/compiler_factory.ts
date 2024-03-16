import { getGlobalLogger } from '../../logger/logger';
import { AssemblyScriptCompiler } from './assemblyscript_compiler';
import { type SourceCodeCompiler } from './compiler';
import {
  TargetLanguage,
  type ProgLangSelectionArgs,
} from './prog_language_selection';
import { WATCompiler } from './wat_compilers';

export async function makeSourceCodeCompiler(
  compilerSelection: ProgLangSelectionArgs, // may point to the source code or compiler configuration
  compilationOutput: string,
): Promise<SourceCodeCompiler> {
  switch (compilerSelection.targetLanguage) {
    case TargetLanguage.WAT:
      return await WATCompiler.createCompiler(compilationOutput);
    case TargetLanguage.AssemblyScript:
      return new AssemblyScriptCompiler(compilationOutput);
    default:
      getGlobalLogger().error(
        'Did not found source code Compiler for language with extension',
        compilerSelection.targetLanguage,
      );
      throw new Error('Unsupported source code extension');
  }
}
