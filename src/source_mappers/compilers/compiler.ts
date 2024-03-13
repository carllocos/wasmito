import { type SourceMap } from '../source_map';
import { type TargetLanguage } from './prog_language_selection';

export abstract class SourceCodeCompiler {
  public abstract readonly targetLanguage: TargetLanguage;

  abstract get latestSourceCodeCompilerArgs(): undefined | any;

  abstract compile(
    compilationArgs: any, // sourceCodeFilePath: string,
  ): Promise<SourceMap>;

  protected static async createCompiler(
    compilerOutputPath: string,
    compilerArgs?: any,
  ): Promise<SourceCodeCompiler> {
    throw new Error('implement by base class');
  }
}
