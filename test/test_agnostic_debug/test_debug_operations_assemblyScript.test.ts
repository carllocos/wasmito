import { expect } from 'chai';
import path from 'path';
import {
  SourceMapfromSourceMapSpec,
  type SourceOffsetStart,
} from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import {
  type DotSerializationConfgig,
  sourceCFGHasOutgoingFunCallEdges,
  type SourceControlFlowGraph,
} from '../../src/cfg/source_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_tree_operations';
import {
  sortIncreasingNr,
  sourceNodeFromLoc,
  sourceNodeLoc,
} from './resuable_code';
import { type SourceMapConfig } from '../../src/source_mappers/source_map';

describe('Debug Operations on AssemblyScript Blink App', function () {
  const pathToRootSource = path.resolve(
    './test/data/assemblyscript_examples/blink/',
  );
  const sourceMapPath = path.resolve(pathToRootSource, 'blink.wasm.map');
  const wasmPath = path.resolve(pathToRootSource, 'blink.wasm');
  const srcPath = path.resolve(pathToRootSource, 'blink.ts');
  const srcFileMapper = new Map<string, string>([['blink/blink.ts', srcPath]]);
  const sourceMapConfig: SourceMapConfig = {
    srcToAbsPath: srcFileMapper,
  };

  let sourceCFG: SourceControlFlowGraph;

  before('parse wasm module', async function () {
    try {
      const startPositioning: SourceOffsetStart = {
        colNrStartNumber: 0,
        lineNrStartNumber: 1,
      };
      const sm = await SourceMapfromSourceMapSpec(
        sourceMapPath,
        wasmPath,
        'typescript',
        startPositioning,
        sourceMapConfig,
      );
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFG = langAdaptor.sourceCFG;
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToRootSource, 'mappings.json'),
      );
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('"step over" pinMode (47, 3) function call', function () {
    const callNode = sourceCFG.nodesFromSourceLoc({
      source: sourceMapPath,
      linenr: 47,
      columnStart: 3,
    });

    expect(callNode.length).to.equal(1);
    const [call] = callNode;
    const nextPossibleLocations = DebugOperations.stepOver(sourceCFG, call);

    expect(nextPossibleLocations.length).to.equal(1);
  });

  it('"step over" addTime (51, 23) function call', function () {
    const callNode = sourceCFG.nodesFromSourceLoc({
      source: sourceMapPath,
      linenr: 51,
      columnStart: 23,
    });

    expect(callNode.length).to.equal(1);
    const [call] = callNode;
    expect(sourceCFGHasOutgoingFunCallEdges(call)).to.be.equal(true);
    const nextPossibleLocations = DebugOperations.stepOver(sourceCFG, call);

    expect(nextPossibleLocations.length).to.equal(2);
  });
});

describe('Debug Operations on AS Intermittent Blink', function () {
  this.timeout(30000);

  const pathToRootSource = path.resolve(
    './test/data/assemblyscript_examples/blink_intermittent/',
  );
  const sourceMapPath = path.resolve(pathToRootSource, 'main.wasm.map');
  const wasmPath = path.resolve(pathToRootSource, 'main.wasm');
  const sourcePath = path.resolve(pathToRootSource, 'blink_intermittent.ts');
  const srcFileMapper = new Map<string, string>([
    [
      'mainblinkintermt.debug/assembly-blink-intermittent/blink_intermittent.ts',
      sourcePath,
    ],
  ]);
  const sourceMapConfig: SourceMapConfig = {
    srcToAbsPath: srcFileMapper,
  };

  let sourceCFG: SourceControlFlowGraph;

  before('parse wasm module', async function () {
    try {
      const startPositioning: SourceOffsetStart = {
        colNrStartNumber: 0,
        lineNrStartNumber: 1,
      };
      const sm = await SourceMapfromSourceMapSpec(
        sourceMapPath,
        wasmPath,
        'typescript',
        startPositioning,
        sourceMapConfig,
      );
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFG = langAdaptor.sourceCFG;
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToRootSource, 'mappings.json'),
      );
      const config: DotSerializationConfgig = {
        includeInstructions: false,
        includeEmptySCFG: false,
      };
      sourceCFG.serializeToDot(pathToRootSource, config);
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('"step into" "pinMode" call line (27, 5)', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 27,
      columnStart: 5,
    });

    const nextNodes = DebugOperations.stepIn(sourceCFG, startNode);
    expect(nextNodes.length).equal(1);

    const nextLoc = sourceNodeLoc(nextNodes[0]);

    expect(nextLoc.linenr).equal(6);
    expect(nextLoc.colnr).equal(15);
  });

  it('"step over" "pinMode" call line (27, 5)', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 27,
      columnStart: 5,
    });

    const nextNodes = DebugOperations.stepOver(sourceCFG, startNode);
    expect(nextNodes.length).equal(1);

    const nextLoc = sourceNodeLoc(nextNodes[0]);

    expect(nextLoc.linenr).equal(29);
    expect(nextLoc.colnr).equal(12);
  });

  it('"step out" of a "pinMode" fun has 1 callside', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 6,
      columnStart: 15,
    });
    const nextNodes = DebugOperations.stepOut(sourceCFG, startNode);
    expect(nextNodes.length).equal(1);
    const n = nextNodes[0];
    const loc = sourceNodeLoc(n);
    expect(loc.linenr).equal(29);
    expect(loc.colnr).equal(12);
  });

  it('"step out" of a "digitalWrite" fun has 3 callsides', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 14,
      columnStart: 20,
    });
    const nextNodes = sortIncreasingNr(
      DebugOperations.stepOut(sourceCFG, startNode),
    );
    expect(nextNodes.length).equal(3);

    const lineNrs = [32, 34, 38];
    const colNrs = [19, 19, 15];
    for (let i = 0; i < nextNodes.length; i++) {
      const n = nextNodes[i];

      const loc = sourceNodeLoc(n);
      expect(loc.linenr).equal(lineNrs[i]);
      expect(loc.colnr).equal(colNrs[i]);
    }
  });
});
