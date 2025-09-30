import path from 'path';
import { type Command } from 'commander';
import {
  createDirectoryIfUnexisting,
  isDirectoryPath,
  isFilePath,
} from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import { WasmCFGs } from '../src/cfg/wasm_cfg';
import { WasmModule } from '../src/webassembly/wasm/wasm_module';

export function registerWCFGCommand(program: Command): void {
  program
    .command('wcfg')
    .description(
      `Build Wasm Control-Flow Graphs (WCFGs). The constructed graphs are stored in <output-dir> in dot format.`,
    )
    .argument('<wasm-path>', 'the wasm for which we build the CFGs.')
    .argument(
      '<output-dir>',
      'the location where to store all the generated CFGs.',
    )
    .option(
      '-t, --timeout <timeout-secs>',
      'the maximum seconds allocated to the build of the CFGs.',
      '180',
    )
    .action(async (wasmPath, outputDir, options) => {
      const logger = getGlobalLogger();
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      } else if (!isDirectoryPath(outputDir)) {
        program.error('<output-dir> is not a valid path to a directory');
      }

      const timeoutMs = Number(options.timeout) * 1000; // convert to millisecs
      if (isNaN(timeoutMs) || timeoutMs < 0) {
        program.error('`<timeout-secs>` is not a positive number');
      }

      try {
        logger.info(`Starting construction WCFGs`);
        const startTime = Date.now();
        const wasm = new WasmModule(wasmPath);
        const wcfgs = new WasmCFGs(wasm);
        const endTime = Date.now();

        const diff = endTime - startTime;
        logger.info(
          `Construction Time Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
        );

        const wasmOutputDir = path.join(outputDir, `/wasm`);
        createDirectoryIfUnexisting(wasmOutputDir);
        logger.info(`Converting Wasm CFGs to dot`);
        wcfgs.serializeToDot(wasmOutputDir);
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Could not build WCFGs error occured: ${errMsg}`);
      }
    });
}
