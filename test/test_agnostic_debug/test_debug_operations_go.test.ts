import { expect } from 'chai';
import path from 'path';
import { SourceMapfromDWARFWasm } from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import { type SourceControlFlowGraph } from '../../src/cfg/source_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_tree_operations';
import {
  sortIncreasingNr,
  sourceNodeFromLoc,
  sourceNodeLoc,
  sourceText,
} from './resuable_code';

describe.skip('Debug Operations on Rust AST Intermittent Blink', function () {
  const app = path.resolve('./test/data/go_examples/main.wasm');
  const sourcePath = path.resolve('./test/data/go_examples/hello_world.go');

  let sourceCFG: SourceControlFlowGraph;

  before('parse wasm module', async function () {
    try {
      const startTime = new Date();
      const sm = await SourceMapfromDWARFWasm(app);
      const endTime = new Date();
      const timeDifference = endTime.getTime() - startTime.getTime();
      console.log(
        `Took: ${timeDifference / 1000} secs (${timeDifference} milliseconds)`,
      );
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFG = langAdaptor.sourceCFG;
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

    const srcTxt = sourceText(nextNodes[0]);
    const nextLoc = sourceNodeLoc(nextNodes[0]);

    expect(srcTxt).equal('env_chip_pin_mode');
    expect(nextLoc.linenr).equal(19);
    expect(nextLoc.colnr).equal(5);
  });

  it('"step into" "1..MAX_SHORT_SLEEPS" std lib call line (48, 1) should be ignored', function () {
    const startNode = sourceNodeFromLoc(sourceCFG, {
      source: sourcePath,
      linenr: 48,
      columnStart: 19,
    });

    const nextNodes = DebugOperations.stepIn(sourceCFG, startNode);
    expect(nextNodes.length).equal(2);
    const n1 = nextNodes[0];
    const srcTxt1 = sourceText(n1);
    const loc1 = sourceNodeLoc(n1);
    expect(srcTxt1).equal('_i');
    expect(loc1.linenr).equal(48);
    expect(loc1.colnr).equal(13);

    const n2 = nextNodes[1];
    const srcTxt2 = sourceText(n2);
    const loc2 = sourceNodeLoc(n2);
    expect(srcTxt2).equal('digital_write');
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

    const srcTxt = sourceText(nextNodes[0]);
    const nextLoc = sourceNodeLoc(nextNodes[0]);

    expect(srcTxt).equal('1');
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
    expect(sourceText(n)).equal('1');
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
    const srcTxs = ['delay', 'delay', 'delay'];
    for (let i = 0; i < nextNodes.length; i++) {
      const n = nextNodes[i];
      const txt = sourceText(n);
      expect(txt).equal(srcTxs[i]);

      const loc = sourceNodeLoc(n);
      expect(loc.linenr).equal(lineNrs[i]);
      expect(loc.colnr).equal(colNrs[i]);
    }
  });
});
