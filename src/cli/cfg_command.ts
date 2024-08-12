import path from 'path';
import { type Command } from 'commander';
import {
  createDirectoryIfUnexisting,
  isDirectoryPath,
  isFilePath,
} from '../util/file_util';
import { type SourceMap } from '../source_mappers/source_map';
import {
  SourceMapfromDWARFWasm,
  SourceMapfromSourceMapSpec,
  type SourceOffsetStart,
} from '../source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../language_adaptors/language_adaptor';
import { type DotSerializationConfgig } from '../cfg/source_cfg';
import { timeoutPromise } from '../util/promise_util';

export function registerCFGCommand(program: Command): void {
  program
    .command('cfg <wasm-path> <output-dir> <timeout-secs>')
    .description(
      `build SourceCode Level Control Flow Graphs (CFG) for the given Wasm module <wasm-path>
       and store them in <output-dir>.
       Specify also a max build time allowed <timeout-secs> expressed in secs.`,
    )
    .argument('[source-map-spec]')
    .action(async (wasmPath, outputDir, timeout, sourceMapSpecPath) => {
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      } else if (!isDirectoryPath(outputDir)) {
        program.error('<output-dir> is not a valid path to a directory');
      } else if (
        sourceMapSpecPath !== undefined &&
        !isFilePath(sourceMapSpecPath)
      ) {
        program.error('`source-map-spec` is not a path to a file');
      }

      let timeoutSecs = Number(timeout);
      if (isNaN(timeoutSecs) || timeoutSecs < 0) {
        program.error('`<timeout-secs>` is not a positive number');
      } else {
        timeoutSecs = timeoutSecs * 1000; // convert to secs
      }

      let smPromise: Promise<SourceMap> | undefined;
      if (sourceMapSpecPath !== undefined) {
        const startPositioning: SourceOffsetStart = {
          colNrStartNumber: 0,
          lineNrStartNumber: 1,
        };
        smPromise = timeoutPromise(
          SourceMapfromSourceMapSpec(
            sourceMapSpecPath,
            wasmPath,
            startPositioning,
          ),
          timeoutSecs,
        );
      } else {
        smPromise = timeoutPromise(
          SourceMapfromDWARFWasm(wasmPath),
          timeoutSecs,
        );
      }
      try {
        const sm = await smPromise;
        createDirectoryIfUnexisting(outputDir);
        sm.storeMappingsToJSON(path.resolve(outputDir, 'mappings.json'));
        const langAdaptor = await constructLanguageAdaptor(sm);
        if (langAdaptor.sourceCFG === undefined) {
          program.error(`Could not build Source CFGs`);
        }

        const wasmOutputDir = path.join(outputDir, `/wasm`);
        createDirectoryIfUnexisting(wasmOutputDir);
        langAdaptor.sourceCFG.wasmCFG.toJSON(wasmOutputDir);
        langAdaptor.sourceCFG.wasmCFG.serializeToDot(wasmOutputDir);
        const config: DotSerializationConfgig = {
          includeInstructions: false,
          includeEmptySCFG: false,
        };
        const sourceCFGsOutputDir = path.join(outputDir, `/source/`);
        createDirectoryIfUnexisting(sourceCFGsOutputDir);
        langAdaptor.sourceCFG.toJSON(sourceCFGsOutputDir);
        langAdaptor.sourceCFG.serializeToDot(sourceCFGsOutputDir, config);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : e;
        program.error(`Could not build CFGs error occured: ${errMsg}`);
      }
    });
}
