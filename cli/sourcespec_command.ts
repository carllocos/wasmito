import path from 'path';
import { type Command } from 'commander';
import { getGlobalLogger } from '../src/logger/logger';
import {
  createDirectoryIfUnexisting,
  isDirectoryPath,
  isFilePath,
} from '../src/util/file_util';
import { timeoutPromise } from '../src/util/promise_util';
import {
  ReadSourceSpecMappings,
  type SourceOffsetStart,
} from '../src/source_mappers/source_map_builder';
import {
  type SourceMapConfig,
  StoreMappingsToJSON,
} from '../src/source_mappers/source_map';

export function registerSourceSpecCommand(program: Command): void {
  program
    .command(
      'sourcespec <wasm-path> <source-spec-path> <output-file.json> <timeout-secs>',
    )
    .option(
      '--offset-line <start-line-nr>',
      `The start line number of the source-spec.
      Some source-spec start at 0 some others start at 1.
      (Defaults to 1)`,
    )
    .option(
      '--offset-col <start-column-nr>',
      `The column nr start of the source-spec.
      Some source-spec start at 0 some others start at 1.
      (Defaults to 0)`,
    )
    .option(
      '--delete-prefixed-dir',
      `From all the source maps it will delete it will delete the parent directory of each mapping.`,
    )
    .option(
      '--prefix-dir <path-to-dir>',
      `It will prefix a directory path to all the mappings of the sourcemap.`,
    )
    .description(
      `Build a JSON sourcemap spec as used by the Source Control Flow graph builder.
      The generated JSON will be stored in <output-file.json> creating parent directories if needed.
      Specify also a max build time allowed <timeout-secs> expressed in secs.`,
    )
    .action(async (wasmPath, sourceSpecPath, outputFile, timeout, options) => {
      const logger = getGlobalLogger();
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid file path');
      }
      if (!isFilePath(sourceSpecPath)) {
        program.error('<source-spec-path> is not a valid file path');
      }

      let timeoutMs = Number(timeout);
      if (isNaN(timeoutMs) || timeoutMs < 0) {
        program.error('`<timeout-secs>` is not a positive number');
      } else {
        timeoutMs = timeoutMs * 1000; // convert to millisecs
      }

      let lineNrStartNumber = 1;
      if (options.offsetLine !== undefined) {
        lineNrStartNumber = Number(options.offsetLine);
        if (isNaN(lineNrStartNumber) || lineNrStartNumber < 0) {
          program.error('`<offset-line>` is not a positive number');
        }
      }

      let colNrStartNumber = 0;
      if (options.colNrStartNumber !== undefined) {
        colNrStartNumber = Number(options.colNrStartNumber);
        if (isNaN(colNrStartNumber) || colNrStartNumber < 0) {
          program.error('`<offset-col>` is not a positive number');
        }
      }

      const startPositioning: SourceOffsetStart = {
        colNrStartNumber,
        lineNrStartNumber,
      };
      const sourceMapConfig: SourceMapConfig = {};

      if (options.prefixDir !== undefined) {
        if (!isDirectoryPath(options.prefixDir)) {
          program.error(`<prefix-dir> does not point to a valid directory`);
        } else {
          sourceMapConfig.prefixSources = options.prefixDir;
        }
      }
      sourceMapConfig.deletePrefixedDir = options.deletePrefixedDir ?? false;

      try {
        logger.info(
          `Building SourceMap JSON from SourceSpec (timeout ${timeout} secs, ${timeout / 60} min)`,
        );

        const startTime = Date.now();
        const sm = await timeoutPromise(
          ReadSourceSpecMappings(
            wasmPath,
            sourceSpecPath,
            startPositioning,
            sourceMapConfig,
          ),
          timeoutMs,
        );
        const endTime = Date.now();
        const diff = endTime - startTime;

        logger.info(
          `Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
        );
        logger.info(`Storing json at ${outputFile}`);
        const outputDir = path.dirname(outputFile);
        createDirectoryIfUnexisting(outputDir);
        StoreMappingsToJSON(outputFile, sm, true);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : e;
        program.error(`Could not the SourceMap JSON error occured: ${errMsg}`);
      }
    });
}
