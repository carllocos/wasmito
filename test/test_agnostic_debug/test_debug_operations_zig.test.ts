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
import { type SourceMapConfig } from '../../src';

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
    ignoreDirectories: ['/opt/homebrew/'],
  };

  let sourceCFG: SourceControlFlowGraph;

  this.timeout(10000);

  before('parse wasm module', async function () {
    try {
      const startPositioning: SourceOffsetStart = {
        colNrStartNumber: 0,
        lineNrStartNumber: 1,
      };
      const sm = await SourceMapfromSourceMapSpec(
        sourceMapPath,
        wasmPath,
        startPositioning,
        sourceMapConfig,
      );
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFG = langAdaptor.sourceCFG;
      sourceCFG.wasmCFG.serializeToDot(pathToDir);
      const config: DotSerializationConfgig = {
        includeInstructions: true,
        includeEmptySCFG: false,
      };
      sourceCFG.serializeToDot(pathToDir, config);
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });
});
