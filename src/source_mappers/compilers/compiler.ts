import { type SourceMap } from '../source_map';

export abstract class SourceCodeCompiler {
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
