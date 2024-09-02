import path from 'path';
import { type Command } from 'commander';
import { getGlobalLogger } from '../src/logger/logger';
import { createDirectoryIfUnexisting, isFilePath } from '../src/util/file_util';
import { timeoutPromise } from '../src/util/promise_util';
import { ReadDWARFMappings } from '../src/source_mappers/source_map_builder';
import { StoreMappingsToJSON } from '../src/source_mappers/source_map';

export function registerSourceMapCommand(program: Command): void {
  program
    .command('sourcemap <wasm-path> <output-file.json> <timeout-secs>')
    .description(
      `build a JSON sourcemap as used by the Source Control Flow graph builder from the <wasm-path>.
      The generated JSON will be stored it in <output-file.json> creating parent directories if needed.
      Specify also a max build time allowed <timeout-secs> expressed in secs.`,
    )
    .action(async (wasmPath, outputFile, timeout) => {
      const logger = getGlobalLogger();
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      }

      let timeoutMs = Number(timeout);
      if (isNaN(timeoutMs) || timeoutMs < 0) {
        program.error('`<timeout-secs>` is not a positive number');
      } else {
        timeoutMs = timeoutMs * 1000; // convert to millisecs
      }

      try {
        logger.info(
          `Building SourceMap JSON from DWARF (timeout ${timeout} secs, ${timeout / 60} min)`,
        );
        const startTime = Date.now();
        const sm = await timeoutPromise(ReadDWARFMappings(wasmPath), timeoutMs);
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
