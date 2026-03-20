import { CodeCoverageTool } from '../tool_examples/code_coverage_tool/CodeCoverageTool';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import { getAbsolutePath, isFilePath } from '../src/util/file_util';
import { spawnDevVM, spawnMCUVM } from '../tool_examples/spawn_vm';
import { BoardBaudRate } from '../src/util/serial_port';
import { WasmitoBackendVM } from '../src';
import { Command } from 'commander';
import fs from 'fs';
import { CodeCoverageToolExecutionTarget } from '../tool_examples/code_coverage_tool/CodeCoverageToolTypes';

function writeOutput(output: string, outputPath?: string): void {
  if (outputPath === undefined) {
    console.log(output);
    return;
  }

  fs.writeFileSync(outputPath, output);
}

function parseTestsFile(path: string): number[] {
  const parsed: { wasmTestFunctionIds: number[] } = JSON.parse(
    fs.readFileSync(path, 'utf8'),
  );

  if (!Array.isArray(parsed.wasmTestFunctionIds)) {
    throw new Error('wasmTestFunctionIds must be an array of numbers.');
  }

  return parsed.wasmTestFunctionIds;
}

function createVM(
  target: CodeCoverageToolExecutionTarget,
  languageAdaptor: LanguageAdaptor,
): Promise<WasmitoBackendVM> {
  switch (target) {
    case 'LOCAL':
      return spawnDevVM(languageAdaptor);
    case 'MCU':
      return spawnMCUVM(languageAdaptor, {
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
  }
}

export function registerCoverageCommand(program: Command) {
  program
    .command('coverage')
    .description(
      'Analyse a WebAssembly (.wasm) module and generate a code coverage report.',
    )
    .argument('<wasm>', 'Path to the Wasm module (.wasm) to analyse.')
    .argument('<mappings>', 'Path to the source mappings file.')
    .argument(
      '<tests>',
      'Path to the JSON file containing an array of Wasm test function IDs.',
    )
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
    .action(async (wasmPath, mappingsPath, testsPath, options) => {
      wasmPath = getAbsolutePath(wasmPath);
      mappingsPath = getAbsolutePath(mappingsPath);
      testsPath = getAbsolutePath(testsPath);

      if (!isFilePath(wasmPath)) program.error('<wasm> is not a valid path.');

      if (!isFilePath(mappingsPath))
        program.error('<mappings> is not a valid path.');

      if (!isFilePath(testsPath)) program.error('<tests> is not a valid path.');

      options.target = options.target.toUpperCase();
      if (options.target !== 'LOCAL' && options.target !== 'MCU')
        program.error('<target> is not a valid target.');

      const languageAdaptor = LanguageAdaptor.fromMappingsPath(mappingsPath, {
        newWasmPath: wasmPath,
        relativePaths: true,
      });

      const codeCoverageTool = new CodeCoverageTool(
        languageAdaptor,
        await createVM(options.target, languageAdaptor),
        parseTestsFile(testsPath),
        {
          timeoutMs: options.timeout,
          includeSourceLocations: options.includeSourceLocations,
        },
      );

      const coverage = await codeCoverageTool.run();
      writeOutput(JSON.stringify(coverage, null, 2), options.output);
    });
}
