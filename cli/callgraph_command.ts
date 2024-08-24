import { type Command } from 'commander';
import {
  createDirectoryIfUnexisting,
  getDirectory,
  isFilePath,
} from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import { buildGraphs } from '../src/cfg/wasm_cfg_builder';
import { WasmModule } from '../src/webassembly/wasm/wasm_module';
import path from 'path';

export function registerCallgraphCommand(program: Command): void {
  program
    .command('callgraph')
    .description(`Build a Callgraph for a given Wasm module`)
    .argument('<wasm-path>', 'the wasm for which we build the callgraph')
    .argument('<timeout-secs>', 'the maximum time allocated to the callgraph')
    .option(
      '-od, --dot-output <output-path>',
      'the location where to store the callgraph. Parent directories are created if needed',
    )
    .action(async (wasmPath, timeout, options) => {
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
      console.log(options);

      let outputFile = options.dotOutput;
      if (options.dotOutput === undefined) {
        outputFile = path.join(process.cwd(), 'callgraph.dot');
      }

      try {
        logger.info(`Starting construction callgraph`);
        const startTime = Date.now();
        const wasm = new WasmModule(wasmPath);
        const [, , callgraph] = buildGraphs(wasm);
        const endTime = Date.now();
        const diff = endTime - startTime;
        logger.info(
          `Construction Time Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
        );

        logger.info(`Storing dot callgraph ${outputFile}`);
        const parentDir = getDirectory(outputFile);
        createDirectoryIfUnexisting(parentDir);

        callgraph.toDot(outputFile);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : e;
        program.error(`Could not build callgraph error occured: ${errMsg}`);
      }
    });
}
