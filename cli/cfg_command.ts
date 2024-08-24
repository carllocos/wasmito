import path from 'path';
import { type Command } from 'commander';
import {
  createDirectoryIfUnexisting,
  isDirectoryPath,
  isFilePath,
  pathJoin,
} from '../src/util/file_util';
import { SourceMapFromJSON } from '../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import { type DotSerializationConfgig } from '../src/cfg/source_cfg';
import { timeoutPromise } from '../src/util/promise_util';
import { getGlobalLogger } from '../src/logger/logger';
import { type SourceMap } from '../src/source_mappers/source_map';

export function registerCFGCommand(program: Command): void {
  program
    .command('cfg')
    .description(
      `Build SourceCode and Wasm-Level Control Flow Graphs(CFGs) as-well-as Callgraphs.`,
    )
    .argument('<wasm-path>', 'the wasm for which we build the CFGs')
    .argument(
      '<output-dir>',
      'the location where to store all the generated CFGs',
    )
    .argument(
      '<timeout-secs>',
      'the maximum time allocated to the build of the CFGs',
    )
    .option(
      '-d, --dwarf <dwarf-path>',
      `reads the DWARF debugging information from either the path to a DWARF encoded file or the wasm module iteself.`,
    )
    .option(
      '-w, --wasmito-json <path-to-wasmito-sourcemap-json>',
      `use as debugging format wasmito internal debugging format`,
    )
    .option(
      '-s, --source-spec <path-to-source-spec>',
      `reads the debugging information from the given file that points to a SourceMap Spec
      of the given wasm module iteself.`,
    )
    .option(
      '-cg, --callgraph <callgraph-name.dot>',
      'enable the build of the callgraph for the wasm and store it in the <output-dir> as <callgraph-name.dot>',
    )
    .action(async (wasmPath, outputDir, timeout, options) => {
      const logger = getGlobalLogger();
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      } else if (!isDirectoryPath(outputDir)) {
        program.error('<output-dir> is not a valid path to a directory');
      }

      let timeoutMs = Number(timeout);
      if (isNaN(timeoutMs) || timeoutMs < 0) {
        program.error('`<timeout-secs>` is not a positive number');
      } else {
        timeoutMs = timeoutMs * 1000; // convert to millisecs
      }

      let callgraphOutputPath: string | undefined;
      if (options.callgraph !== undefined) {
        callgraphOutputPath = pathJoin(outputDir, options.callgraph);
      }

      const wasmitoPath = options.wasmitoJson;
      const dwarfPath = options.dwarf;
      const sourceSpecPath = options.sourceSpec;
      let smPromise: Promise<SourceMap> | undefined;

      if (wasmitoPath !== undefined) {
        if (!isFilePath(wasmitoPath)) {
          program.error(
            '`the <path-to-wasmito-sourcemap-json> is not a path to a file',
          );
        }
        smPromise = SourceMapFromJSON(wasmitoPath);
      } else if (dwarfPath !== undefined) {
        program.error(`dwarf todo`);
      } else if (sourceSpecPath !== undefined) {
        program.error(`source-map spec todo`);
      } else {
        program.error('At least one debugging format should be opted for');
      }
      if (smPromise === undefined) {
        program.error('SourceMap should not be empty');
      }

      try {
        const sm = await timeoutPromise(smPromise, timeoutMs);
        createDirectoryIfUnexisting(outputDir);
        // sm.storeMappingsToJSON(path.resolve(outputDir, 'mappings.json'));
        logger.info(`Starting construction CFGs`);
        const startTime = Date.now();
        const langAdaptor = await timeoutPromise(
          constructLanguageAdaptor(sm),
          timeoutMs,
        );
        const endTime = Date.now();
        if (langAdaptor.sourceCFG === undefined) {
          logger.error(`Failed to build Source CFGs`);
          program.error(`Failed to build Source CFGs`);
        }

        const diff = endTime - startTime;
        logger.info(
          `Construction Time Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
        );

        const wasmOutputDir = path.join(outputDir, `/wasm`);
        createDirectoryIfUnexisting(wasmOutputDir);
        // the following CFGs conversion to JSON is very expensive
        // logger.debug(`Converting Wasm CFGs to JSON`);
        // langAdaptor.sourceCFG.wasmCFG.toJSON(wasmOutputDir);
        logger.info(`Converting Wasm CFGs to dot`);
        langAdaptor.sourceCFG.wasmCFG.serializeToDot(wasmOutputDir);
        // if (options.callgraph !== undefined) {
        //   langAdaptor.sourceCFG.wasmCFG.callgraphToDot(callgraph);
        // }
        const config: DotSerializationConfgig = {
          includeInstructions: false,
          includeEmptySCFG: false,
        };
        const sourceCFGsOutputDir = path.join(outputDir, `/source/`);
        createDirectoryIfUnexisting(sourceCFGsOutputDir);
        logger.info(`Converting Source CFGs to JSON`);
        langAdaptor.sourceCFG.toJSON(sourceCFGsOutputDir);
        logger.info(`Converting Source CFGs to dot`);
        langAdaptor.sourceCFG.serializeToDot(sourceCFGsOutputDir, config);
        if (callgraphOutputPath !== undefined) {
          langAdaptor.sourceCFG.wasmCFG.callgraph.toDot(callgraphOutputPath);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Could not build CFGs error occured: ${errMsg}`);
      }
    });
}
