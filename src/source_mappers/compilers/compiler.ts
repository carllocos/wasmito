import { type SourceMap } from '../source_map';

export abstract class SourceCodeCompiler {
  abstract compile(
    sourceCodeFilePath: string,
    wasmOutputFile?: string,
  ): Promise<SourceMap>;
}
