import { expect } from 'chai';
import path from 'path';
import {
  DebugStandard,
  readSourceMap,
} from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import { type SourceCFGs } from '../../src/cfg/source_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_operations';
import {
  DefaultColumnStartNumber,
  DefaultLineStartNumber,
  SourceMapConfig,
} from '../../src/source_mappers/source_map_config';

describe('Debug Until Call Operation on AssemblyScript Blink App', function () {
  const pathToRootSource = path.resolve(
    './test/data/assemblyscript_examples/blink/',
  );
  const sourceMapPath = path.resolve(pathToRootSource, 'blink.wasm.map');
  const wasmPath = path.resolve(pathToRootSource, 'blink.wasm');
  const srcPath = path.resolve(pathToRootSource, 'blink.ts');
  const srcFileMapper = new Map<string, string>([['blink/blink.ts', srcPath]]);
  const sourceMapConfig: SourceMapConfig = {
    srcToAbsPath: srcFileMapper,
    colNrStartNumber: DefaultColumnStartNumber,
    lineNrStartNumber: DefaultLineStartNumber,
  };

  let sourceCFGs: SourceCFGs;

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
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToRootSource, 'mappings.json'),
      );
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('until Call" starting at (45, 1)', function () {
    const entryNode = sourceCFGs.nodesFromSourceLoc({
      source: srcPath,
      linenr: 45,
      colnr: -1,
      name: '',
      address: -1,
    });

    expect(entryNode.length).to.greaterThanOrEqual(1);
    const [entry] = entryNode;
    const nextPossibleLocations = DebugOperations.stepUntilCall(
      sourceCFGs,
      entry,
    );

    expect(nextPossibleLocations.length).to.equal(1);
    const [nextNode] = nextPossibleLocations[0];

    expect(nextNode.sourceLocation.linenr).to.equal(47);
    expect(nextNode.sourceLocation.colnr).to.lessThanOrEqual(3);
  });

  it('until Call" starting at line 50', function () {
    const entryNode = sourceCFGs.nodesFromSourceLoc({
      source: srcPath,
      linenr: 50,
      colnr: -1,
      name: '',
      address: -1,
    });

    expect(entryNode.length).to.greaterThanOrEqual(1);
    const [entry] = entryNode;
    const nextPossibleLocations = DebugOperations.stepUntilCall(
      sourceCFGs,
      entry,
    );

    expect(nextPossibleLocations.length).to.equal(1);
    const [nextNode] = nextPossibleLocations[0];

    expect(nextNode.sourceLocation.linenr).to.equal(51);
    expect(nextNode.sourceLocation.colnr).to.lessThanOrEqual(27);
  });
});
