import { CodeCoverageTool } from '../tool_examples/code-coverage-tool/CodeCoverageTool';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import { getAbsolutePath, isFilePath } from '../src/util/file_util';
import { spawnDevVM } from '../tool_examples/spawn_vm';
import { Command } from 'commander';

export function registerCoverageCommand(program: Command) {
  program
    .command('coverage')
    .description('Run code coverage')
    .argument('<wasm-path>', 'path to wasm')
    .argument('<mappings-path>', 'path to mappings')
    .action(async (wasmPath, mappingsPath) => {
      wasmPath = getAbsolutePath(wasmPath);
      mappingsPath = getAbsolutePath(mappingsPath);

      if (!isFilePath(wasmPath))
        program.error('<wasm-path> is not a valid path');

      if (!isFilePath(mappingsPath))
        program.error('<mappings-path> is not a valid path');

      const languageAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
        newWasmPath: wasmPath,
        relativePaths: true,
      });
      const vm = await spawnDevVM(languageAdaptor);

      const codeCoverageTool = new CodeCoverageTool(languageAdaptor, vm);
      await codeCoverageTool.run();
    });
}
