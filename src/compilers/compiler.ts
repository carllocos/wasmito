import { type OldSourceMap } from '../source_mappers/source_map';
import { type TargetLanguage } from './prog_language_selection';

/*
 * The SourceCodeCompiler makes it possible to ingtegrate the compiler of a language that compiles to Wasm into the toolkit
 * However, language implementors are not forced to extend the class to enable tooling support for their language.
 * Tooling support should work out of the box as long as the language generates DWARF or SourceMaps.
 * In other words, extends this class for convenience use of a language.
 */

export abstract class SourceCodeCompiler {
  public abstract readonly targetLanguage: TargetLanguage;

  abstract get latestSourceCodeCompilerArgs(): undefined | any;

  abstract compile(compilationArgs: any): Promise<OldSourceMap>;

  protected static async createCompiler(
    compilerOutputPath: string,
    compilerArgs?: any,
  ): Promise<SourceCodeCompiler> {
    throw new Error('implement by base class');
  }
}
