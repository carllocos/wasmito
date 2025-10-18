import { expect } from 'chai';
import path from 'path';
import { SourceMapFromJSON } from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import { isCallNode, type SourceCFGs } from '../../src/cfg/source_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_operations';
import {
  sortIncreasingNr,
  sourceNodeFromLoc,
  sourceNodeLoc,
} from './reusable_code';

describe('Debug Operations on AssemblyScript Blink App', function () {
  const pathToRootSource = path.resolve(
    './test/data/assemblyscript_examples/blink/',
  );
  const mappingsPath = path.resolve(pathToRootSource, 'mappings.json');
  const srcPath = path.resolve(pathToRootSource, 'blink.ts');
  let sourceCFGs: SourceCFGs;

  before('parse wasm module', async function () {
    try {
      const sm = SourceMapFromJSON(mappingsPath, {
        columnOffset: 1,
      });
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFGs = langAdaptor.sourceCFG;
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('"step over" pinMode (47, 3) function call', function () {
    const callNode = sourceCFGs.nodesFromSourceLoc({
      source: srcPath,
      linenr: 47,
      colnr: 3,
      name: '',
      address: 0,
    });

    expect(callNode.length).to.equal(1);
    const [call] = callNode;
    expect(isCallNode(call));
    const nextPossibleLocations = DebugOperations.stepOver(sourceCFGs, call);

    expect(nextPossibleLocations.length).to.equal(1);
  });

  it('"step over" addTime (51, 23) function call', function () {
    const nodes = sourceCFGs.nodesFromSourceLoc({
      source: srcPath,
      linenr: 51,
      colnr: 23,
      name: '',
      address: 0,
    });

    expect(nodes.length).to.equal(2);
    let foundCallNode = false;
    for (const n of nodes) {
      if (isCallNode(n)) {
        foundCallNode = true;
        const nextPossibleLocations = DebugOperations.stepOver(sourceCFGs, n);
        expect(nextPossibleLocations.length).to.equal(1);
      }
    }
    expect(foundCallNode).to.be.equal(
      true,
      'No callNode found at location (51,23)',
    );
  });
});

describe('Debug Operations on AS Intermittent Blink', function () {
  this.timeout(30000);

  const pathToRootSource = path.resolve(
    './test/data/assemblyscript_examples/blink_intermittent/',
  );
  const mappingsPath = path.resolve(pathToRootSource, 'mappings.json');
  const sourcePath = path.resolve(pathToRootSource, 'blink_intermittent.ts');
  let sourceCFGs: SourceCFGs;

  before('parse wasm module', async function () {
    try {
      const sm = SourceMapFromJSON(mappingsPath);
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFGs = langAdaptor.sourceCFG;
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('"step into" "pinMode" call line (27, 5)', function () {
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 27,
      colnr: 5,
      name: '',
      address: 0,
    });

    const nextNodes = DebugOperations.stepIn(sourceCFGs, startNode);
    expect(nextNodes.length).equal(1);

    const [nextNode] = nextNodes[0];
    const nextLoc = sourceNodeLoc(nextNode);

    expect(nextLoc.linenr).equal(6);
    expect(nextLoc.colnr).equal(15);
  });

  it('"step over" "pinMode" call line (27, 5)', function () {
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 27,
      colnr: 5,
      name: '',
      address: 0,
    });

    const nextNodes = DebugOperations.stepOver(sourceCFGs, startNode);
    expect(nextNodes.length).equal(1);

    const [nextNode] = nextNodes[0];
    const nextLoc = sourceNodeLoc(nextNode);

    expect(nextLoc.linenr).equal(29);
    expect(nextLoc.colnr).equal(5);
  });

  it('"step out" of a "pinMode" fun has 1 callside', function () {
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 6,
      colnr: 15,
      name: '',
      address: 0,
    });
    const nextNodes = DebugOperations.stepOut(sourceCFGs, startNode);
    expect(nextNodes.length).equal(1);
    const [n] = nextNodes[0];
    const loc = sourceNodeLoc(n);
    expect(loc.linenr).equal(29);
    expect(loc.colnr).equal(5);
  });

  it('"step out" of a "digitalWrite" fun has 3 callsides', function () {
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 14,
      colnr: 20,
      name: '',
      address: 0,
    });
    const nextNodes = sortIncreasingNr(
      DebugOperations.stepOut(sourceCFGs, startNode),
    );
    expect(nextNodes.length).equal(3);

    const lineNrs = [32, 34, 38];
    const colNrs = [19, 19, 15];
    for (let i = 0; i < nextNodes.length; i++) {
      const [n] = nextNodes[i];

      const loc = sourceNodeLoc(n);
      expect(loc.linenr).equal(lineNrs[i]);
      expect(loc.colnr).equal(colNrs[i]);
    }
  });
});
