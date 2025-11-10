import { type Command } from 'commander';
import { isFilePath } from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import { readFileSync, writeFileSync } from 'fs';
import { Addr2lineError, Module, ParseError, StripError } from 'wasmito-tools';
import { ReadDWARFMappings } from '../src/source_mappers/debug_standards/dwarf_reader';
import { StoreMappingsToJSON } from '../src/source_mappers/source_map';

export function registerWatCommand(program: Command): void {
  program
    .command('wat')
    .description(`compile a wat module to wasm`)
    .argument('<wat-path>', 'the wat path')
    .argument('<wasm-path>', 'the output path')
    .option(
      '-m,--mappings <output-mappings.json>',
      `store the source mappings into the given output file`,
    )
    .action(async (watPath, wasmPath, options) => {
      const logger = getGlobalLogger();
      if (!isFilePath(watPath)) {
        program.error('<wat-path> is not a valid path to a Wat module');
      }
      try {
        const wat = readFileSync(watPath, 'utf-8');
        const wasm = Module.from_wat(watPath, wat);
        logger.info(`Wasm stored at '${wasmPath}'`);
        writeFileSync(wasmPath, wasm.bytes);

        const mappingsPath = options.mappings;
        if (mappingsPath !== undefined) {
          const mappings = await ReadDWARFMappings(wasmPath);
          logger.info(`mappings stored at '${mappingsPath}'`);
          StoreMappingsToJSON(mappingsPath, mappings);
        }
      } catch (e) {
        let errMsg = '';
        if (
          e instanceof StripError ||
          e instanceof ParseError ||
          e instanceof Addr2lineError
        )
          errMsg += e.context;
        else if (e instanceof Error) errMsg += `${e.message}${e.stack ?? ''}`;
        else errMsg += `${e}`;
        program.error(`wasm command failed due : ${errMsg}`);
      }
    });
}
