import { type Command } from 'commander';
import { isFilePath } from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import { WasmModule } from '../src/webassembly/wasm/wasm_module';
import { readFileSync, writeFileSync } from 'fs';
import { StripConfig, StripError } from 'wasmito-tools';

export function registerWasmModuleCommand(program: Command): void {
  program
    .command('wasm')
    .description(`Manipulate a Wasm module that adheres to Wasm version 1.`)
    .argument('<wasm-path>', 'the path to a Wasm version 1')
    .option(
      '-s,--store-instructions <output-path.json>',
      `store the instructions of the wasm module in a JSON file`,
    )
    .option(
      '--strip-custom <path-to-stripped.wasm>',
      `remove the custom section and store to given path`,
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
          logger.info(`storing Wasm instructions to '${storePath}'`);
          writeFileSync(storePath, content);
        }

        const stripPath = options.stripCustom;
        if (stripPath !== undefined) {
          const stripConfig = new StripConfig(true, []);
          const buffer = readFileSync(wasmPath);
          const stripped = stripConfig.strip(buffer);
          logger.info(`storing stripped Wasm to '${stripPath}'`);
          writeFileSync(stripPath, stripped);
        }
      } catch (e) {
        let errMsg = '';
        if (e instanceof StripError) errMsg += e.context;
        else if (e instanceof Error) errMsg += `${e.message}${e.stack ?? ''}`;
        else errMsg += `${e}`;
        program.error(`wasm command failed due : ${errMsg}`);
      }
    });
}
