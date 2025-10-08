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

describe('Debug Operations on Zig App', function () {
  const pathToDir = path.resolve(
    './test/data/zig_examples/blink_intermittent/',
  );
  const wasmPath = path.join(pathToDir, 'blink_intermittent.wasm');
  const sourcePath = path.join(pathToDir, 'blink_intermittent.zig');
  const sourceMapPath = path.join(pathToDir, 'blink_intermittent.wasm.map');
  const srcToAbsPath = new Map<string, string>([
    ['blink_intermittent.zig', sourcePath],
  ]);
  const sourceMapConfig: SourceMapConfig = {
    srcToAbsPath,
    ignore: ['/opt/homebrew/'],
    colNrStartNumber: DefaultColumnStartNumber,
    lineNrStartNumber: DefaultLineStartNumber,
  };

  let sourceCFGs: SourceCFGs;

  this.timeout(10000);

  before('parse wasm module', async function () {
    try {
      const sm = await readSourceMap(
        DebugStandard.SourceMapSpec,
        wasmPath,
        sourceMapPath,
        sourceMapConfig,
      );
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFGs = langAdaptor.sourceCFG;
      sourceCFGs.wasmCFGs.serializeToDot(pathToDir);
      const config: DotSerializationConfig = {
        includeInstructions: true,
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
