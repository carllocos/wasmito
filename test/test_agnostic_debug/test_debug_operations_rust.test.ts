import { expect } from 'chai';
import path from 'path';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import {
  type DotSerializationConfig,
  type SourceCFGs,
} from '../../src/cfg/source_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_operations';
import {
  sortIncreasingNr,
  sourceNodeFromLoc,
  sourceNodeLoc,
} from './reusable_code';
import {
  DebugStandard,
  readSourceMap,
} from '../../src/source_mappers/source_map_builder';

describe.skip('Debug Operations on Rust AST Blink App', function () {
  const pathToDir = path.resolve('./test/data/rust_examples/blink/');
  const blinkApp = path.join(pathToDir, 'main.wasm');
  const sourcePath = path.join(pathToDir, 'main.rs');
  let sourceCFGs: SourceCFGs;

  this.timeout(10000);

  before('parse wasm module', async function () {
    try {
      const sm = await readSourceMap(DebugStandard.DWARF, blinkApp, blinkApp);
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFGs = langAdaptor.sourceCFG;
      sourceCFGs.wasmCFGs.serializeToDot(pathToDir);
      const config: DotSerializationConfig = {
        includeInstructions: false,
        includeEmptySCFG: false,
        includeExitNode: true,
        includeEntryNode: true,
      };
      sourceCFGs.serializeToDot(pathToDir, config);
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToDir, 'mappings.json'),
      );
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

describe.skip('Debug Operations on Rust AST Intermittent Blink', function () {
  const pathToDir = path.resolve(
    './test/data/rust_examples/blink_intermittent/',
  );
  const app = path.join(pathToDir, 'blink_intermittent.wasm');
  const sourcePath = path.join(pathToDir, 'blink_intermittent.rs');
  let sourceCFGs: SourceCFGs;

  this.timeout(30000);

  before('parse wasm module', async function () {
    try {
      const sm = await readSourceMap(DebugStandard.DWARF, app, app);
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFGs = langAdaptor.sourceCFG;
      sourceCFGs.wasmCFGs.serializeToDot(pathToDir);
      const config: DotSerializationConfig = {
        includeInstructions: false,
        includeEmptySCFG: false,
        includeExitNode: true,
        includeEntryNode: true,
      };
      sourceCFGs.serializeToDot(pathToDir, config);
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToDir, 'mappings.json'),
      );
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
    const startNode = sourceNodeFromLoc(sourceCFGs, {
      source: sourcePath,
      linenr: 48,
      colnr: 19,
      name: '',
      address: 0,
    });

    const nextNodes = DebugOperations.stepIn(sourceCFGs, startNode);
    expect(nextNodes.length).equal(2);
    const [n1] = nextNodes[0];
    const loc1 = sourceNodeLoc(n1);
    expect(loc1.linenr).equal(48);
    expect(loc1.colnr).equal(13);

    const [n2] = nextNodes[1];
    const loc2 = sourceNodeLoc(n2);
    expect(loc2.linenr).equal(55);
    expect(loc2.colnr).equal(9);
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

    expect(nextLoc.linenr).equal(48);
    expect(nextLoc.colnr).equal(19);
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
    expect(loc.linenr).equal(48);
    expect(loc.colnr).equal(19);
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
