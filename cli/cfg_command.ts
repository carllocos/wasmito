import path from 'path';
import { type Command } from 'commander';
import {
  createDirectoryIfUnexisting,
  isDirectoryPath,
  isFilePath,
  pathJoin,
} from '../src/util/file_util';
import {
  SourceMapFromJSON,
  SourceMapfromSourceMapSpec,
  type SourceOffsetStart,
} from '../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import { timeoutPromise } from '../src/util/promise_util';
import { getGlobalLogger } from '../src/logger/logger';
import { type SourceMap } from '../src/source_mappers/source_map';
import { CoarseGrainedSourceCFGraph } from '../src/cfg/source_cfg_coarse';
import { mkdirSync } from 'fs';

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
    .option(
      '-t, --timeout <timeout-secs>',
      'the maximum seconds allocated to the build of the CFGs',
      '180',
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
    .option(
      '--unused-mappings <output-name.json>',
      `will generate a json containing the source mappings that were not used when building the CFGs.
      This can be helpful to assess soundness of the generated Source level CFGs.
      Unused mappings can be an indicator that the Source CFG is missing nodes.`,
    )
    .option(
      '--dot-no-exitnode',
      'do not include the exit node in the generated dot file',
    )
    .option(
      '--dot-no-entrynode',
      'do not include the entry node in the generated dot file',
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

      let callgraphOutputPath: string | undefined;
      if (options.callgraph !== undefined) {
        callgraphOutputPath = pathJoin(outputDir, options.callgraph);
      }

      let unusedMappings: string | undefined;
      if (options.unusedMappings !== undefined) {
        unusedMappings = pathJoin(outputDir, options.unusedMappings);
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
        const startPositioning: SourceOffsetStart = {
          colNrStartNumber: 0,
          lineNrStartNumber: 1,
        };
        smPromise = SourceMapfromSourceMapSpec(
          sourceSpecPath,
          wasmPath,
          startPositioning,
        );
      } else {
        program.error('At least one debugging format should be opted for');
      }
      if (smPromise === undefined) {
        program.error('SourceMap should not be empty');
      }

      try {
        logger.info(`Parsing Wasm Module`);
        const startTimeParse = Date.now();
        const sm = await timeoutPromise(smPromise, timeoutMs);
        const endTimeParse = Date.now();
        const diffParse = endTimeParse - startTimeParse;
        logger.info(
          `Parse Time Took ${diffParse} ms, ${diffParse / 1000} secs, ${diffParse / 1000 / 60} mins`,
        );

        createDirectoryIfUnexisting(outputDir);
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
        logger.info(`Converting Wasm CFGs to dot`);
        langAdaptor.sourceCFG.wasmCFGs.serializeToDot(wasmOutputDir);

        const sourceCFGsOutputDir = path.join(outputDir, `/source/`);
        createDirectoryIfUnexisting(sourceCFGsOutputDir);
        logger.info(`Converting Source CFGs to dot`);
        const dotNameIfTooLong = 'sourcecfg';
        langAdaptor.sourceCFG.serializeToDot(
          sourceCFGsOutputDir,
          {
            includeInstructions: false,
            includeEmptySCFG: false,
            includeExitNode: options.dotNoExitnode === undefined,
            includeEntryNode: options.dotNoEntrynode === undefined,
          },
          dotNameIfTooLong,
        );
        const sourceWithInstrs = path.join(outputDir, `/source_with_instrs/`);
        createDirectoryIfUnexisting(sourceWithInstrs);
        langAdaptor.sourceCFG.serializeToDot(
          sourceWithInstrs,
          {
            includeInstructions: true,
            includeEmptySCFG: false,
            includeExitNode: options.dotNoExitnode === undefined,
            includeEntryNode: options.dotNoEntrynode === undefined,
          },
          dotNameIfTooLong,
        );
        if (callgraphOutputPath !== undefined) {
          logger.info(`Converting Callgraph to dot at ${callgraphOutputPath}`);
          langAdaptor.sourceCFG.wasmCFGs.callgraph.toDot(callgraphOutputPath);
        }

        if (options.coarseGrained !== undefined) {
          logger.info(`Converting Source CFGs to Coarse Grained CFGs`);
          const startConversion = Date.now();
          const coarseCFGs = new CoarseGrainedSourceCFGraph(
            langAdaptor.sourceCFG,
          );
          const conversionTime = startConversion - Date.now();
          logger.info(
            `Construction Time Took ${conversionTime} ms, ${conversionTime / 1000} secs, ${conversionTime / 1000 / 60} mins`,
          );
          logger.info('Storing Coarse Grained CFGs to dot');
          const coarseOutPutDir = pathJoin(outputDir, 'coarse');
          if (!isDirectoryPath(coarseOutPutDir)) {
            mkdirSync(coarseOutPutDir);
          }
          coarseCFGs.serializeToDot(coarseOutPutDir, dotNameIfTooLong);
        }

        if (unusedMappings !== undefined) {
          logger.info(`Storing UnusedMappingsJSON`);
          langAdaptor.unusedMappingsToJSON(unusedMappings);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Could not build CFGs error occured: ${errMsg}`);
      }
    });
}
