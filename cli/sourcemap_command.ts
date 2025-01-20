import path from 'path';
import { type Command } from 'commander';
import { getGlobalLogger } from '../src/logger/logger';
import {
  createDirectoryIfUnexisting,
  getAbsolutePath,
  isFilePath,
  readFileAsJSON,
} from '../src/util/file_util';
import { timeoutPromise } from '../src/util/promise_util';
import {
  ReadDWARFMappings,
  ReadSourceSpec,
  type SourceOffsetStart,
} from '../src/source_mappers/source_map_builder';
import {
  type SourceMapConfig,
  type SourceMapJSON,
  StoreMappingsToJSON,
} from '../src/source_mappers/source_map';

export function registerSourceMapCommand(program: Command): void {
  program
    .command('sourcemap <wasm-path> <output-file.json> <timeout-secs>')
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
      of the given wasm module iteself.`,
    )
    .option('-r, --rebase-locations <path-to-config.json>')
    .option(
      '--all-mappings',
      'include also the source mappings for files that do not exist on the current machine',
    )
    .action(async (wasmPath, outputFile, timeout, options) => {
      const logger = getGlobalLogger();
      const dwarfPath = options.dwarf;
      const sourceSpec = options.sourceSpec;
      wasmPath = getAbsolutePath(wasmPath);
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      }

      if (sourceSpec === undefined && dwarfPath === undefined) {
        program.error('either --dwarf or --source-spec is missing');
      } else if (sourceSpec !== undefined && dwarfPath !== undefined) {
        program.error('only --dwarf or --source-spec is expected');
      } else if (sourceSpec !== undefined) {
        if (!isFilePath(sourceSpec)) {
          program.error(
            '--source-spec <path-to-source-spec> is not a valid path to a file',
          );
        }
      } else {
        if (!isFilePath(dwarfPath)) {
          program.error(
            '--dwarf <dwarf-path> is not a valid path to a Wasm module containing dwarf',
          );
        }
      }

      let timeoutMs = Number(timeout);
      if (isNaN(timeoutMs) || timeoutMs < 0) {
        program.error('`<timeout-secs>` is not a positive number');
      } else {
        timeoutMs = timeoutMs * 1000; // convert to millisecs
      }

      let smJSON: Promise<SourceMapJSON> | undefined;
      let kindDebuggingFormat = '';
      const config: SourceMapConfig = {};
      if (dwarfPath !== undefined) {
        kindDebuggingFormat = 'DWARF';
        smJSON = ReadDWARFMappings(dwarfPath);
      } else {
        kindDebuggingFormat = 'SourceSpec';
        const startPositioning: SourceOffsetStart = {
          colNrStartNumber: 0,
          lineNrStartNumber: 1,
        };
        const rebaseJSONPath = options.rebaseLocations;
        if (rebaseJSONPath !== undefined) {
          if (!isFilePath(rebaseJSONPath)) {
            program.error(
              `The given source location rebase config '${options.prefixSources}' is not a valid file path`,
            );
          }

          config.srcToAbsPath = new Map<string, string>();
          const rebase = await readFileAsJSON(rebaseJSONPath);
          const pathsAr = rebase.absolutePaths;
          if (Array.isArray(pathsAr)) {
            for (let i = 0; i < pathsAr.length; i++) {
              const pathMap = pathsAr[i];
              if (!Array.isArray(pathMap) || pathMap.length !== 2) {
                program.error('A filepath map requires 2 values');
              } else {
                const [p1, p2] = pathMap;
                if (typeof p1 !== 'string' || typeof p2 !== 'string') {
                  program.error('Filepaths are supposed to be strings');
                }
                config.srcToAbsPath.set(p1, p2);
              }
            }
          }
        }
        smJSON = ReadSourceSpec(sourceSpec, wasmPath, startPositioning, config);
      }

      try {
        logger.info(
          `Building SourceMap JSON from ${kindDebuggingFormat} (timeout ${timeout} secs, ${timeout / 60} min)`,
        );
        const startTime = Date.now();
        const sm = await timeoutPromise(smJSON, timeoutMs);
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
