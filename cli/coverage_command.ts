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
    .description(
      'Analyse a WebAssembly module (.wasm) and generate a code coverage report.',
    )
    .argument(
      '<wasm-path>',
      'Path to the WebAssembly module (.wasm) to analyse.',
    )
    .argument('<mappings-path>', 'Path to the source mapping file.')
    .option(
      '--covered-source-code-locations',
      'Include source file, line number and column number for each covered line of source code.',
    )
    .option(
      '--max-analysis-time <ms>',
      'Maximum time limit for the analysis in milliseconds.',
    )
    .option(
      '-o, --output <output-path>',
      'Write the coverage report to the specified file instead of stdout.',
    )
    .action(async (wasmPath, mappingsPath, options) => {
      wasmPath = getAbsolutePath(wasmPath);
      mappingsPath = getAbsolutePath(mappingsPath);

      if (!isFilePath(wasmPath))
        program.error('<wasm-path> is not a valid path.');

      if (!isFilePath(mappingsPath))
        program.error('<mappings-path> is not a valid path.');

      const languageAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
        newWasmPath: wasmPath,
        relativePaths: true,
      });
      const vm = await spawnDevVM(languageAdaptor);

      const codeCoverageTool = new CodeCoverageTool(languageAdaptor, vm, {
        maxAnalysisTimeMs: options.maxAnalysisTime,
        includeCoveredSourceCodeLocations: options.coveredSourceCodeLocations,
      });
      const coverage = await codeCoverageTool.run();
      const result = JSON.stringify(coverage, null, 2);

      if (options.output !== undefined) {
        const outputFile = path.join(process.cwd(), options.output);
        const parentDirectory = getDirectory(outputFile);
        createDirectoryIfUnexisting(parentDirectory);
        fs.writeFileSync(outputFile, result);
      } else {
        console.log(result);
      }
    });
}
