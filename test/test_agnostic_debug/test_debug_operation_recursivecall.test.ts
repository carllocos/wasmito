import { expect } from 'chai';
import path from 'path';
import {
  DebugStandard,
  readSourceMap,
  SourceMapFromJSON,
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

describe('Step Recursive Call on AssemblyScript Blink App', function () {
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

  it('step recursive Call" starting at (45, 1)', function () {
    const entryNode = sourceCFGs.nodesFromSourceLoc({
      source: srcPath,
      linenr: 45,
      colnr: -1,
      name: '',
      address: -1,
    });

    expect(entryNode.length).to.greaterThanOrEqual(1);
    const [entry] = entryNode;
    const nextPossibleLocations = DebugOperations.stepRecursiveCall(
      sourceCFGs,
      entry,
    );

    expect(nextPossibleLocations.length).to.equal(0);
  });
});

describe('Step Recursive Call in Rust Factorial', function () {
  const rootDir = path.resolve('.');
  const pathToRootSource = path.resolve('./test/data/rust_examples/fac/');
  const srcPath = path.resolve('./test/data/rust_examples/fac/fac.rs');
  const mappings = path.resolve(pathToRootSource, 'mappings.json');
  const wasmPath = path.resolve(pathToRootSource, 'fac.wasm');
  const sourceMapConfig: SourceMapConfig = {
    prefixSources: rootDir,
    colNrStartNumber: DefaultColumnStartNumber,
    lineNrStartNumber: DefaultLineStartNumber,
    newWasmPath: wasmPath,
  };

  let sourceCFGs: SourceCFGs;

  before('parse wasm module', async function () {
    try {
      const sm = SourceMapFromJSON(mappings, sourceMapConfig);
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFGs = langAdaptor.sourceCFG;
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('step recursive Call" starting at line 64', function () {
    const entryNode = sourceCFGs.nodesFromSourceLoc({
      source: srcPath,
      linenr: 64,
      colnr: -1,
      name: '',
      address: -1,
    });

    expect(entryNode.length).to.greaterThanOrEqual(1);
    const [entry] = entryNode;
    const nextPossibleLocations = DebugOperations.stepRecursiveCall(
      sourceCFGs,
      entry,
    );

    expect(nextPossibleLocations.length).to.equal(0);
  });

  it('step recursive Call" starting at line 37', function () {
    const entryNode = sourceCFGs.nodesFromSourceLoc({
      source: srcPath,
      linenr: 37,
      colnr: -1,
      name: '',
      address: -1,
    });

    expect(entryNode.length).to.greaterThanOrEqual(1);
    const [entry] = entryNode;
    const nextPossibleLocations = DebugOperations.stepRecursiveCall(
      sourceCFGs,
      entry,
    );

    expect(nextPossibleLocations.length).to.equal(1);
    const [nextNode] = nextPossibleLocations[0];
    expect(nextNode.sourceLocation.linenr).to.greaterThanOrEqual(35);
    expect(nextNode.sourceLocation.linenr).to.lessThanOrEqual(36);
  });

  it('step recursive Call" starting at line 44', function () {
    const entryNode = sourceCFGs.nodesFromSourceLoc({
      source: srcPath,
      linenr: 44,
      colnr: -1,
      name: '',
      address: -1,
    });

    expect(entryNode.length).to.greaterThanOrEqual(1);
    const [entry] = entryNode;
    const nextPossibleLocations = DebugOperations.stepRecursiveCall(
      sourceCFGs,
      entry,
    );

    expect(nextPossibleLocations.length).to.equal(0);
  });
});
