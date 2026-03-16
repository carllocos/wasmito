import { CodeCoverageTool } from '../tool_examples/code_coverage_tool/CodeCoverageTool';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import { spawnDevVM, spawnMCUVM } from '../tool_examples/spawn_vm';
import { BoardBaudRate } from '../src/util/serial_port';
import { WasmitoBackendVM } from '../src';
import { Command } from 'commander';
import {
  createDirectoryIfUnexisting,
  getAbsolutePath,
  getDirectory,
  isFilePath,
} from '../src/util/file_util';
import path from 'path';
import fs from 'fs';

export function registerCoverageCommand(program: Command) {
  program
    .command('coverage')
    .description(
      'Analyse a WebAssembly (.wasm) module and generate a code coverage report.',
    )
    .argument('<wasm>', 'Path to the Wasm module (.wasm) to analyse.')
    .argument('<mappings>', 'Path to the source mappings file.')
    .argument('<tests...>', 'IDs of Wasm test function to execute.')
    .option(
      '-s, --include-source-locations',
      'Include source file, line and column information for covered code.',
    )
    .option(
      '-T, --target <type>',
      'Execution target: "local" (default) or "mcu".',
      'local',
    )
    .option('-t, --timeout <ms>', 'Maximum analysis time in milliseconds.')
    .option(
      '-o, --output <output-path>',
      'Write the coverage report to a file instead of stdout.',
    )
    .action(async (wasmPath, mappingsPath, wasmTestFunctionIds, options) => {
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
      let vm: WasmitoBackendVM;
      if (options.target === 'local') {
        vm = await spawnDevVM(languageAdaptor);
      } else if (options.target === 'mcu') {
        vm = await spawnMCUVM(languageAdaptor, {
          vmConfig: {
            pauseOnStart: true,
            serialPort: '/dev/cu.usbserial-7D5220948B',
            baudrate: BoardBaudRate.BD_115200,
            fqbn: {
              boardName: 'M5Stick-C',
              fqbn: 'm5stack:esp32:m5stick-c',
            },
          },
        });
      } else {
        program.error('invalid target.');
      }

      const codeCoverageTool = new CodeCoverageTool(
        languageAdaptor,
        vm,
        wasmTestFunctionIds,
        {
          maxAnalysisTimeMs: options.maxAnalysisTime,
          includeCoveredSourceCodeLocations: options.includeSourceLocations,
        },
      );
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
