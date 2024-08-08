import { expect } from 'chai';
import path from 'path';
import { SourceMapfromDWARFWasm } from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import {
  type DotSerializationConfgig,
  type SourceControlFlowGraph,
} from '../../src/cfg/source_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_tree_operations';
import {
  logNode,
  sortIncreasingNr,
  sourceNodeFromLoc,
  sourceNodeLoc,
} from './resuable_code';

describe('Debug Operations on Rust AST Blink App', function () {
  const pathToDir = path.resolve('./test/data/rust_examples/blink/');
  const blinkApp = path.join(pathToDir, 'main.wasm');
  const sourcePath = path.join(pathToDir, 'main.rs');
  let sourceCFG: SourceControlFlowGraph;

  this.timeout(10000);

  before('parse wasm module', async function () {
    try {
      console.log(`The path used to read the examples is ${pathToDir}`);
      const sm = await SourceMapfromDWARFWasm(blinkApp);
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFG = langAdaptor.sourceCFG;
      sourceCFG.wasmCFG.serializeToDot(pathToDir);
      const config: DotSerializationConfgig = {
        includeInstructions: false,
        includeEmptySCFG: false,
      };
      sourceCFG.serializeToDot(pathToDir, config);
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToDir, 'mappings.json'),
      );
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('"step into" debug operation', function () {
    const startNodes = sourceCFG.nodesFromSourceLoc({
      source: sourcePath,
      linenr: 44,
      columnStart: 1,
    });
    assert(startNodes.length === 1);
    // logNode(sourceNode);
    const startNode = startNodes[0];

    let nextPossibleLocations = DebugOperations.stepIn(sourceCFG, startNode);
    expect(nextPossibleLocations.length).to.equal(1);
    logNode(nextPossibleLocations[0]);

    const [pinModeCall] = nextPossibleLocations;
    nextPossibleLocations = DebugOperations.stepIn(sourceCFG, pinModeCall);
    expect(nextPossibleLocations.length).to.equal(1);
    // logNode(nextPossibleLocations[0]);
  });

  it('"step into" if-expression', function () {
    const startNodes = sourceCFG.nodesFromSourceLoc({
      source: sourcePath,
      linenr: 56,
      columnStart: 12,
    });

    expect(startNodes.length).to.equal(1);
    const [branch] = startNodes;
    let nextPossibleLocations = DebugOperations.stepIn(sourceCFG, branch);

    expect(nextPossibleLocations.length).to.equal(2);

    const [, useNode] = nextPossibleLocations;
    nextPossibleLocations = DebugOperations.stepIn(sourceCFG, useNode);
    expect(nextPossibleLocations.length).to.equal(1);
  });

  it('"step out" of a fun call', function () {
    const startNodes = sourceCFG.nodesFromSourceLoc({
      source: sourcePath,
      linenr: 27,
      columnStart: 5,
    });

    expect(startNodes.length).to.equal(1);
    const [branch] = startNodes;
    const nextPossibleLocations = DebugOperations.stepOut(sourceCFG, branch);
    expect(nextPossibleLocations.length).to.equal(1);
  });
});

describe('Debug Operations on Rust AST Intermittent Blink', function () {
  const pathToDir = path.resolve(
    './test/data/rust_examples/blink_intermittent/',
  );
  const app = path.join(pathToDir, 'blink_intermittent.wasm');
  const sourcePath = path.join(pathToDir, 'blink_intermittent.rs');
  let sourceCFG: SourceControlFlowGraph;

  this.timeout(30000);

  before('parse wasm module', async function () {
    try {
      console.log(`The path used to read the examples is ${pathToDir}`);
      const sm = await SourceMapfromDWARFWasm(app);
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFG = langAdaptor.sourceCFG;
      sourceCFG.wasmCFG.serializeToDot(pathToDir);
      const config: DotSerializationConfgig = {
        includeInstructions: false,
        includeEmptySCFG: false,
      };
      sourceCFG.serializeToDot(pathToDir, config);
      langAdaptor.sourceMap.storeMappingsToJSON(
        path.resolve(pathToDir, 'mappings.json'),
      );
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('"step into" "pin_mode" call line (45, 5)', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 45,
      columnStart: 5,
    });

    const nextNodes = DebugOperations.stepIn(sourceCFG, startNode);
    expect(nextNodes.length).equal(1);

    const nextLoc = sourceNodeLoc(nextNodes[0]);

    expect(nextLoc.linenr).equal(17);
    expect(nextLoc.colnr).equal(1);
  });

  it('"step into" "1..MAX_SHORT_SLEEPS" std lib call line (48, 19) should be ignored', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 48,
      columnStart: 19,
    });

    const nextNodes = DebugOperations.stepIn(sourceCFG, startNode);
    expect(nextNodes.length).equal(2);
    const n1 = nextNodes[0];
    const loc1 = sourceNodeLoc(n1);
    expect(loc1.linenr).equal(48);
    expect(loc1.colnr).equal(13);

    const n2 = nextNodes[1];
    const loc2 = sourceNodeLoc(n2);
    expect(loc2.linenr).equal(55);
    expect(loc2.colnr).equal(9);
  });

  it('"step over" "pin_mode" call line (45, 5)', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 45,
      columnStart: 5,
    });

    const nextNodes = DebugOperations.stepOver(sourceCFG, startNode);
    expect(nextNodes.length).equal(1);

    const nextLoc = sourceNodeLoc(nextNodes[0]);

    expect(nextLoc.linenr).equal(48);
    expect(nextLoc.colnr).equal(19);
  });

  it('"step out" of a "pin_mode" fun has 1 callside', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 19,
      columnStart: 5,
    });
    const nextNodes = DebugOperations.stepOut(sourceCFG, startNode);
    expect(nextNodes.length).equal(1);
    const n = nextNodes[0];
    const loc = sourceNodeLoc(n);
    expect(loc.linenr).equal(48);
    expect(loc.colnr).equal(19);
  });

  it('"step out" of a "digital_write" fun has 3 callsides', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 25,
      columnStart: 5,
    });
    const nextNodes = sortIncreasingNr(
      DebugOperations.stepOut(sourceCFG, startNode),
    );
    expect(nextNodes.length).equal(3);

    const lineNrs = [50, 52, 56];
    const colNrs = [13, 13, 9];
    for (let i = 0; i < nextNodes.length; i++) {
      const n = nextNodes[i];

      const loc = sourceNodeLoc(n);
      expect(loc.linenr).equal(lineNrs[i]);
      expect(loc.colnr).equal(colNrs[i]);
    }
  });
});
