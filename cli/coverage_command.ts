import { CodeCoverageTool } from '../tool_examples/code-coverage-tool/CodeCoverageTool';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import {
  createDirectoryIfUnexisting,
  getAbsolutePath,
  getDirectory,
  isFilePath,
} from '../src/util/file_util';
import { spawnDevVM } from '../tool_examples/spawn_vm';
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';

export function registerCoverageCommand(program: Command) {
  program
    .command('coverage')
    .description('Run code coverage')
    .argument('<wasm-path>', 'Path to Wasm file')
    .argument('<mappings-path>', 'Path to mappings file')
    .option(
      '--covered-source-code-locations',
      'Display sourceFile, lineNr and colNr for each covered line of source code',
    )
    .option('-o, --output <output-path>', 'Output file path')
    .action(async (wasmPath, mappingsPath, options) => {
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

      const codeCoverageTool = new CodeCoverageTool(languageAdaptor, vm, {
        includeCoveredSourceCodeLocations:
          options.coveredSourceCodeLocations ?? false,
      });
      const coverage = await codeCoverageTool.run();
      const result = JSON.stringify(coverage, null, 2);

      if (options.output !== undefined) {
        const outputFile = path.join(process.cwd(), options.output);
        const parentDirectory = getDirectory(outputFile);
        createDirectoryIfUnexisting(parentDirectory);
        fs.writeFileSync(outputFile, result);
      }

      console.log(result);
    });
}
