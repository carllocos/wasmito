import path from 'path';
import { type Command } from 'commander';
import { getGlobalLogger } from '../src/logger/logger';
import {
  createDirectoryIfUnexisting,
  getAbsolutePath,
  isFilePath,
} from '../src/util/file_util';
import { timeoutPromise } from '../src/util/promise_util';
import {
  DebugStandard,
  readSourceMapJSON,
} from '../src/source_mappers/source_map_builder';
import { StoreMappingsToJSON } from '../src/source_mappers/source_map';
import {
  readSourceMapConfig,
  SourceMapConfig,
} from '../src/source_mappers/source_map_config';

export function registerSourceMapCommand(program: Command): void {
  program
    .command('sourcemap <wasm-path> <output-file.json>')
    .description(
      `extract the source mappings from debugging information and store them as JSON in <output-file.json>. Parent directories are created if needed.`,
    )
    .option(
      '-d, --dwarf <dwarf-path>',
      `use DWARF to construct the source mappings. If the argument is omitted, DWARF is extracted from the wasm module itself.`,
    )
    .option(
      '-s, --source-spec <path-to-source-spec>',
      `use Source Map Spec to extract the source mappings.`,
    )
    .option(
      '-r, --rebase-locations <path-to-config.json>',
      'a JSON configuration file that allows to alter the source mappings.\nThe following fields can be configured:\n{ "absolutePaths": [["old_path1", "new_path2"], ["old_path2", "new_path2"]],\n"prefixSources": "prefix_path",\n"ignore":["prefix_dir1","prefix_dir2","file_path"],\n"columnOffset": 1,\n"lineOffset": 1}',
    )
    .option(
      '-a, --all-mappings',
      'include all the source mappings in the output JSON files. The produces JSON may contain source mappings pointing to source files (e.g., standard lib) that do not exist on the local machine.',
    )
    .option(
      '-t, --timeout <timeout-secs>',
      'the maximum seconds allocated to extract the source mappings.',
      '180',
    )
    .option(
      '--disable-clean',
      'Deactivate removing the source mappings from the output file that have no associated Wasm instruction.',
    )
    .action(async (wasmPath, outputFile, options) => {
      const logger = getGlobalLogger();
      let debuggingInformationPath = options.dwarf ?? options.sourceSpec;
      wasmPath = getAbsolutePath(wasmPath);
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      }

      if (debuggingInformationPath === undefined) {
        program.error('either --dwarf or --source-spec is missing');
      } else if (
        options.sourceSpec !== undefined &&
        options.dwarf !== undefined
      ) {
        program.error('only --dwarf or --source-spec is expected');
      }

      if (!isFilePath(debuggingInformationPath)) {
        program.error(
          `The provided debugging information is not a valid path to a file. Given ${debuggingInformationPath}`,
        );
      }
      debuggingInformationPath = getAbsolutePath(debuggingInformationPath);

      const timeout = Number(options.timeout) * 1000; // convert to millisecs
      if (isNaN(timeout) || timeout < 0) {
        program.error('`<timeout-secs>` is not a positive number');
      }

      let config: SourceMapConfig = {};
      if (options.rebaseLocations !== undefined) {
        if (!isFilePath(options.rebaseLocations)) {
          program.error(
            `The given source location rebase config '${options.prefixSources}' is not a valid file path`,
          );
        }
        config = await readSourceMapConfig(options.rebaseLocations);
      }
      config.removeUnusedMappings = options.disableClean === undefined;
      config.keepAllMappings = !!options.allMappings;
      const kindDebuggingFormat =
        options.dwarf !== undefined
          ? DebugStandard.DWARF
          : DebugStandard.SourceMapSpec;
      const smJSON = readSourceMapJSON(
        kindDebuggingFormat,
        wasmPath,
        debuggingInformationPath,
        config,
      );

      try {
        logger.info(
          `Building SourceMap JSON from ${kindDebuggingFormat} (timeout ${timeout} secs, ${timeout / 60} min)`,
        );
        const startTime = Date.now();
        const sm = await timeoutPromise(smJSON, timeout);
        const endTime = Date.now();
        const diff = endTime - startTime;

        logger.info(
          `Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
        );
        logger.info(`Storing json at ${outputFile}`);
        const outputDir = path.dirname(outputFile);
        createDirectoryIfUnexisting(outputDir);
        StoreMappingsToJSON(outputFile, sm);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : e;
        program.error(`Could not build the SourceMap error occured: ${errMsg}`);
      }
    });
}
