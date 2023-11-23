import { getGlobalLogger } from '../../logger/logger';
import { getFileExtension } from '../../util/file_util';
import { type SourceCodeCompiler } from './compiler';
import { WATCompiler } from './wat_compilers';

export function makeSourceCodeCompiler(
  sourceCodePath: string,
  compilationOutput: string,
): SourceCodeCompiler {
  const fileType = getFileExtension(sourceCodePath);
  switch (fileType) {
    case 'wast':
    case 'wat':
      getGlobalLogger().info(`using WATCompiler for ${sourceCodePath}`);
      return new WATCompiler(compilationOutput);
    default:
      getGlobalLogger().error(
        `Did not found source code Compiler for ${sourceCodePath}`,
      );
      throw new Error('Unsupported source code extension');
  }
}
