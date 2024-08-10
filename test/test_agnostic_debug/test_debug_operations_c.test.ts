import path from 'path';
import {
  SourceMapfromSourceMapSpec,
  type SourceOffsetStart,
} from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import {
  type DotSerializationConfgig,
  type SourceControlFlowGraph,
} from '../../src/cfg/source_cfg';
import { type SourceMapConfig } from '../../src/source_mappers/source_map';

describe('Debug operations on C Blink Intermittent App', function () {
  const pathToDir = path.resolve('./test/data/c_examples/blink_intermittent/');
  const app = path.join(pathToDir, 'blink_intermittent.wasm');
  const sourcePath = path.join(pathToDir, 'blink_intermittent.c');
  const pathToSrcMap = path.join(pathToDir, 'main.wasm.map');

  let sourceCFG: SourceControlFlowGraph;
  const srcFileMapper = new Map<string, string>([
    ['blink_intermittent.c', sourcePath],
  ]);
  const sourceMapConfig: SourceMapConfig = {
    srcToAbsPath: srcFileMapper,
  };

  this.timeout(30000);

  before('parse wasm module', async function () {
    try {
      const startPositioning: SourceOffsetStart = {
        colNrStartNumber: 0,
        lineNrStartNumber: 1,
      };
      const sm = await SourceMapfromSourceMapSpec(
        pathToSrcMap,
        app,
        startPositioning,
        sourceMapConfig,
      );
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFG = langAdaptor.sourceCFG;
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToDir, 'mappings.json'),
      );
      sourceCFG.wasmCFG.serializeToDot(pathToDir);
      const config: DotSerializationConfgig = {
        includeInstructions: false,
        includeEmptySCFG: false,
      };
      sourceCFG.serializeToDot(pathToDir, config);
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });
});
