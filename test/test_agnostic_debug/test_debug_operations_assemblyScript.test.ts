import { expect } from 'chai';
import path from 'path';
import {
  SourceMapfromSourceMapSpec,
  type SourceOffsetStart,
} from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import {
  sourceCFGHasOutgoingFunCallEdges,
  type SourceCFGNode,
  type SourceControlFlowGraph,
} from '../../src/cfg/source_cfg';
import { DebugAgnosticOperations } from '../../src/language_adaptors/debug_tree_operations';

describe('Debug Operations on AssemblyScript Blink App', function () {
  const pathToRootSource = path.resolve(
    './test/data/assemblyscript_examples/blink/',
  );
  const sourceMapPath = path.resolve(pathToRootSource, 'blink.wasm.map');
  const wasmPath = path.resolve(pathToRootSource, 'blink.wasm');
  const srcPath = path.resolve(pathToRootSource, 'blink.ts');
  const srcFileMapper = new Map<string, string>([['blink/blink.ts', srcPath]]);

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
      const startPositioning: SourceOffsetStart = {
        colNrStartNumber: 0,
        lineNrStartNumber: 1,
      };
      const sm = await SourceMapfromSourceMapSpec(
        sourceMapPath,
        wasmPath,
        'typescript',
        startPositioning,
        srcFileMapper,
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
    const nextPossibleLocations = DebugAgnosticOperations.stepOver(
      sourceCFG,
      call,
    );

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
    const nextPossibleLocations = DebugAgnosticOperations.stepOver(
      sourceCFG,
      call,
    );

    expect(nextPossibleLocations.length).to.equal(2);
  });
});
