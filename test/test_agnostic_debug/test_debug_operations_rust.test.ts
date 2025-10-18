import { expect } from 'chai';
import path from 'path';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import { type SourceCFGs } from '../../src/cfg/source_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_operations';
import {
  sortIncreasingNr,
  sourceNodeFromLoc,
  sourceNodeLoc,
} from './reusable_code';
import { SourceMapFromJSON } from '../../src/source_mappers/source_map_builder';

describe('Debug Operations on Rust AST Blink App', function () {
  const pathToDir = path.resolve('./test/data/rust_examples/blink/');
  const sourcePath = path.join(pathToDir, 'main.rs');
  const mappingsPath = path.join(pathToDir, 'mappings.json');
  let sourceCFGs: SourceCFGs;

  this.timeout(10000);

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

  it('"step into" debug operation from location (44, 1)', function () {
    const startNodes = sourceCFGs.nodesFromSourceLoc({
      source: sourcePath,
      linenr: 44,
      colnr: 1,
      name: '',
      address: 0,
    });
    assert(startNodes.length === 1, `#${startNodes.length} items instead of 1`);
    const startNode = startNodes[0];

    let nextPossibleLocations = DebugOperations.stepIn(sourceCFGs, startNode);
    expect(nextPossibleLocations.length).to.equal(1);

    const [[pinModeCall]] = nextPossibleLocations;
    nextPossibleLocations = DebugOperations.stepIn(sourceCFGs, pinModeCall);
    expect(nextPossibleLocations.length).to.equal(1);
  });

  it('"step into" if-expression from (56, 12)', function () {
    const startNodes = sourceCFGs.nodesFromSourceLoc({
      source: sourcePath,
      linenr: 56,
      colnr: 12,
      address: 0,
      name: '',
    });

    expect(startNodes.length).to.equal(1);
    const [branch] = startNodes;
    let nextPossibleLocations = DebugOperations.stepIn(sourceCFGs, branch);

    expect(nextPossibleLocations.length).to.equal(2);

    const [, [useNode]] = nextPossibleLocations;
    nextPossibleLocations = DebugOperations.stepIn(sourceCFGs, useNode);
    expect(nextPossibleLocations.length).to.equal(1);
  });

  it('"step out" of a fun call from location (27, 5)', function () {
    const startNodes = sourceCFGs.nodesFromSourceLoc({
      source: sourcePath,
      linenr: 27,
      colnr: 5,
      name: '',
      address: 0,
    });

    expect(startNodes.length).to.equal(1);
    const [branch] = startNodes;
    const nextPossibleLocations = DebugOperations.stepOut(sourceCFGs, branch);
    expect(nextPossibleLocations.length).to.equal(1);
  });
});

describe('Debug Operations on Rust AST Intermittent Blink', function () {
  const pathToDir = path.resolve(
    './test/data/rust_examples/blink_intermittent/',
  );
  const sourcePath = path.join(pathToDir, 'blink_intermittent.rs');
  const mappingsPath = path.join(pathToDir, 'mappings.json');
  let sourceCFGs: SourceCFGs;

  this.timeout(30000);

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

  it('"step into" "pin_mode" call line (45, 5)', function () {
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 45,
      colnr: 5,
      name: '',
      address: 0,
    });

    const nextNodes = DebugOperations.stepIn(sourceCFGs, startNode);
    expect(nextNodes.length).equal(1);

    const [nextNode] = nextNodes[0];
    const nextLoc = sourceNodeLoc(nextNode);

    expect(nextLoc.linenr).equal(17);
    expect(nextLoc.colnr).equal(1);
  });

  it('"step into" "1..MAX_SHORT_SLEEPS" std lib call line (48, 19) should be ignored', function () {
    const ns = sourceCFGs.nodesFromSourceLoc({
      source: sourcePath,
      linenr: 48,
      colnr: 19,
      name: '',
      address: 0,
    });
    expect(ns.length).equal(2);
    const [, startNode] = ns;
    const nextNodes = DebugOperations.stepIn(sourceCFGs, startNode);
    expect(nextNodes.length).equal(2);
    for (const [n] of nextNodes) {
      const loc = sourceNodeLoc(n);
      if (loc.linenr === 48) {
        expect(loc.linenr).equal(48);
        expect(loc.colnr).equal(13);
      } else {
        expect(loc.linenr).equal(55);
        expect(loc.colnr).equal(9);
      }
    }
  });

  it('"step over" "pin_mode" call line (45, 5)', function () {
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 45,
      colnr: 5,
      name: '',
      address: 0,
    });

    const nextNodes = DebugOperations.stepOver(sourceCFGs, startNode);
    expect(nextNodes.length).equal(1);

    const [nextNode] = nextNodes[0];
    const nextLoc = sourceNodeLoc(nextNode);

    // It may seem that computation has to advance to line 48 & col 19
    expect(nextLoc.linenr).equal(5);
    expect(nextLoc.colnr).equal(1);
  });

  it('"step out" from location (19, 5) of a "pin_mode" fun has 1 callside', function () {
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 19,
      colnr: 5,
      name: '',
      address: 0,
    });
    const nextNodes = DebugOperations.stepOut(sourceCFGs, startNode);
    expect(nextNodes.length).equal(1);
    const [n] = nextNodes[0];
    const loc = sourceNodeLoc(n);
    expect(loc.linenr).equal(5);
    expect(loc.colnr).equal(1);
  });

  it('"step out" from loc (25, 5) of a "digital_write" fun has 3 callsides', function () {
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 25,
      colnr: 5,
      name: '',
      address: 0,
    });
    const nextNodes = sortIncreasingNr(
      DebugOperations.stepOut(sourceCFGs, startNode),
    );
    expect(nextNodes.length).equal(3);

    const lineNrs = [50, 52, 56];
    const colNrs = [13, 13, 9];
    for (let i = 0; i < nextNodes.length; i++) {
      const [n] = nextNodes[i];

      const loc = sourceNodeLoc(n);
      expect(loc.linenr).equal(lineNrs[i]);
      expect(loc.colnr).equal(colNrs[i]);
    }
  });
});
