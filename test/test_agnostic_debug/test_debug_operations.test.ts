import { expect } from 'chai';
import path from 'path';
import { SourceMapfromDWARFWasm } from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import {
  type SourceCFGNode,
  type SourceControlFlowGraph,
} from '../../src/cfg/source_cfg';
import { DebugAgnosticOperations } from '../../src';

describe('Debug Operations on Rust AST Blink App', function () {
  const blinkApp = path.resolve('./test/data/rust_examples/blink/main.wasm');
  let sourceCFG: SourceControlFlowGraph;

  function logNode(n: SourceCFGNode): void {
    const sp = n.node.startPosition;
    const ep = n.node.endPosition;
    console.log(
      `{startLoc: (${sp.linenr}, ${sp.colnr}), endLoc: (${ep.linenr}, ${ep.colnr}), srcTxt: '${n.node.node.text}'}`,
    );
  }

  before('parse wasm module', async function () {
    try {
      const sm = await SourceMapfromDWARFWasm(blinkApp);
      const langAdaptor = await constructLanguageAdaptor(sm);
      assert(langAdaptor.sourceCFG !== undefined);
      sourceCFG = langAdaptor.sourceCFG;
    } catch (e) {
      fail(`Could not construct sourcemap or langadaptor. Reason ${e}`);
    }
  });

  it('"step into" debug operation', function () {
    const startWasmAddr = 493; // Source Loc (44, 1)
    const sourceNodes = sourceCFG.nodesFromAddress(startWasmAddr);
    expect(sourceNodes.length).to.equal(1);
    const [sourceNode] = sourceNodes;
    logNode(sourceNode);

    let nextPossibleLocations = DebugAgnosticOperations.stepIn(
      sourceCFG,
      sourceNode,
    );
    expect(nextPossibleLocations.length).to.equal(1);
    logNode(nextPossibleLocations[0]);

    const [pinModeCall] = nextPossibleLocations;
    nextPossibleLocations = DebugAgnosticOperations.stepIn(
      sourceCFG,
      pinModeCall,
    );
    expect(nextPossibleLocations.length).to.equal(2);
    logNode(nextPossibleLocations[0]);
    logNode(nextPossibleLocations[1]);
  });
});
