import { type Command } from 'commander';
import { isFilePath } from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import { WasmModule } from '../src/webassembly/wasm/wasm_module';
import { writeFileSync } from 'fs';

export function registerWasmParseCommand(program: Command): void {
  program
    .command('checkwasmparse')
    .description(`check if wasm version 1 is used`)
    .argument('<wasm-path>', 'the wasm for which the check needs to occur')
    .option(
      '--store-instructions <output-path.json>',
      `store the instructions of the wasm module in a json file`,
    )
    .action(async (wasmPath, options) => {
      const logger = getGlobalLogger();
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      }
      try {
        const m = new WasmModule(wasmPath);
        logger.info(`Wasm '${m.wasmPath}' could be parsed`);
        const storePath = options.storeInstructions;
        if (storePath !== undefined) {
          const obj = m.toJSON();
          const content = JSON.stringify(obj);
          writeFileSync(storePath, content);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Could not be parsed error occurred: ${errMsg}`);
      }
    });
}
