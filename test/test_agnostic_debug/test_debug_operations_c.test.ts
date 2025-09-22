import path from 'path';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import {
  type DotSerializationConfig,
  type SourceCFGs,
} from '../../src/cfg/source_cfg';
import {
  DefaultColumnStartNumber,
  DefaultLineStartNumber,
  SourceMapConfig,
} from '../../src/source_mappers/source_map_config';
import {
  DebugStandard,
  readSourceMap,
} from '../../src/source_mappers/source_map_builder';

describe('Debug operations on C Blink Intermittent App', function () {
  const pathToDir = path.resolve('./test/data/c_examples/blink_intermittent/');
  const app = path.join(pathToDir, 'blink_intermittent.wasm');
  const sourcePath = path.join(pathToDir, 'blink_intermittent.c');
  const pathToSrcMap = path.join(pathToDir, 'main.wasm.map');

  let sourceCFGs: SourceCFGs;
  const srcFileMapper = new Map<string, string>([
    ['blink_intermittent.c', sourcePath],
  ]);
  const sourceMapConfig: SourceMapConfig = {
    srcToAbsPath: srcFileMapper,
    colNrStartNumber: DefaultColumnStartNumber,
    lineNrStartNumber: DefaultLineStartNumber,
  };

  this.timeout(30000);

  before('parse wasm module', async function () {
    try {
      const sm = await readSourceMap(
        DebugStandard.SourceMapSpec,
        app,
        pathToSrcMap,
        sourceMapConfig,
      );
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFGs = langAdaptor.sourceCFG;
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToDir, 'mappings.json'),
      );
      sourceCFGs.wasmCFGs.serializeToDot(pathToDir);
      const config: DotSerializationConfig = {
        includeInstructions: false,
        includeEmptySCFG: false,
        includeExitNode: true,
        includeEntryNode: true,
      };
      sourceCFGs.serializeToDot(pathToDir, config);
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });
});
