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
      `build a JSON sourcemap as used by the Source Control Flow graph builder from the <wasm-path>.
      The generated JSON will be stored it in <output-file.json> creating parent directories if needed.
      Specify also a max build time allowed <timeout-secs> expressed in secs.`,
    )
    .option(
      '-d, --dwarf <dwarf-path>',
      `reads the DWARF debugging information from either the path to a DWARF encoded file or the wasm module iteself.`,
    )
    .option(
      '-s, --source-spec <path-to-source-spec>',
      `reads the debugging information from the given file that points to a SourceMap Spec
      of the given wasm module itself.`,
    )
    .option(
      '-r, --rebase-locations <path-to-config.json>',
      'a json file containing one of the following fields:\n{ "absolutePaths": [["old_path1", "new_path2"], ["old_path2", "new_path2"]],\n"prefixSources": "prefix_path",\n"ignoreDirectories":["prefix_dir1","prefix_dir2"]}',
    )
    .option(
      '--all-mappings',
      'include also the source mappings for files that do not exist on the current machine',
    )
    .option(
      '-t, --timeout <timeout-secs>',
      'the maximum seconds allocated to load the sourcemap according to our format',
      '180',
    )
    .option(
      '--disable-clean',
      'Deactivate removing the source mappings that have no associated Wasm instruction',
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
      config.cleanMappings = options.disableClean === undefined;

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
        const onlyExistingMappings = options.allMappings === undefined;
        StoreMappingsToJSON(outputFile, sm, onlyExistingMappings);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : e;
        program.error(`Could not build the SourceMap error occured: ${errMsg}`);
      }
    });
}
