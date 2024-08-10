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

export function registerCFGCommand(program: Command): void {
  program
    .command('cfg <wasm-path> <output-dir>')
    .description(
      'build SourceCode Level Control Flow Graphs (CFG) for the given Wasm module <wasm-path> and store them in <output-dir>',
    )
    .argument('[source-map-spec]')
    .action(async (wasmPath, outputDir, sourceMapSpecPath) => {
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

      let smPromise: Promise<SourceMap> | undefined;
      if (sourceMapSpecPath !== undefined) {
        const startPositioning: SourceOffsetStart = {
          colNrStartNumber: 0,
          lineNrStartNumber: 1,
        };
        smPromise = SourceMapfromSourceMapSpec(
          sourceMapSpecPath,
          wasmPath,
          startPositioning,
        );
      } else {
        smPromise = SourceMapfromDWARFWasm(wasmPath);
      }
      try {
        const sm = await smPromise;
        const mappingsPath = path.join(outputDir, '/cfg/');
        createDirectoryIfUnexisting(mappingsPath);
        sm.storeMappingsToJSON(path.resolve(mappingsPath, 'mappings.json'));
        const langAdaptor = await constructLanguageAdaptor(sm);
        if (langAdaptor.sourceCFG === undefined) {
          program.error(`Could not build Source CFGs`);
        }

        const wasmOutputDir = path.join(outputDir, '/cfg/wasm');
        createDirectoryIfUnexisting(wasmOutputDir);
        langAdaptor.sourceCFG.wasmCFG.toJSON(wasmOutputDir);
        langAdaptor.sourceCFG.wasmCFG.serializeToDot(wasmOutputDir);
        const config: DotSerializationConfgig = {
          includeInstructions: false,
          includeEmptySCFG: false,
        };
        const sourceCFGsOutputDir = path.join(outputDir, '/cfg/source/');
        createDirectoryIfUnexisting(sourceCFGsOutputDir);
        langAdaptor.sourceCFG.serializeToDot(sourceCFGsOutputDir, config);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : e;
        program.error(`Could not CFGs error occured: ${errMsg}`);
      }
    });
}
