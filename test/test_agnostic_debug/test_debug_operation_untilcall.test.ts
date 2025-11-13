import { expect } from 'chai';
import path from 'path';
import { SourceMapFromJSON } from '../../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import assert, { fail } from 'assert';
import { type SourceCFGs } from '../../src/cfg/source_cfg';
import { DebugOperations } from '../../src/language_adaptors/debug_operations';
import { CFGOperations } from '../../src/tool_api/cfg_util';

describe('Debug Until Call Operation on AssemblyScript Blink App', function () {
  const pathToRootSource = path.resolve(
    './test/data/assemblyscript_examples/blink/',
  );
  const mappingsPath = path.resolve(pathToRootSource, 'mappings.json');
  const srcPath = path.resolve(pathToRootSource, 'blink.ts');
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

  it('until Call" starting at (line 45, col 1)', function () {
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

describe('Debug Until Call Operation on C and linked Zig Blink App', function () {
  const pathToRootSource = path.resolve('./test/data/c_zig/blink/');
  const mappingsPath = path.resolve(pathToRootSource, 'mappings.json');
  const cSource = path.resolve(pathToRootSource, 'blink.c');
  const zigSource = path.resolve(pathToRootSource, 'arduino.zig');
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

  it('until Call" starting at (line 5, col 1)', function () {
    const entryNode = sourceCFGs.nodesFromSourceLoc({
      source: cSource,
      linenr: 5,
      colnr: 1,
      name: '',
      address: -1,
    });

    expect(entryNode.length).to.equal(1);
    const [entry] = entryNode;
    const nextPossibleLocations = DebugOperations.stepUntilCall(
      sourceCFGs,
      entry,
    );

    expect(nextPossibleLocations.length).to.equal(1);
    const [nextNode] = nextPossibleLocations[0];

    expect(CFGOperations.isCallNode(nextNode));
    expect(nextNode.sourceLocation.linenr).to.equal(12);
    expect(nextNode.sourceLocation.colnr).to.lessThanOrEqual(5);
  });

  it('until Call" starting from a func call at (line 12, col 5)', function () {
    const callNode = sourceCFGs.nodesFromSourceLoc({
      source: cSource,
      linenr: 12,
      colnr: 5,
      name: '',
      address: -1,
    });

    expect(callNode.length).to.equal(1);
    const [call] = callNode;
    expect(CFGOperations.isCallNode(call));
    const nextPossibleLocations = DebugOperations.stepUntilCall(
      sourceCFGs,
      call,
    );

    expect(nextPossibleLocations.length).to.equal(0);
  });

  it('until Call" starting from func call entry at (line 13, col 1)', function () {
    const startNode = sourceCFGs.nodesFromSourceLoc({
      source: zigSource,
      linenr: 13,
      colnr: 1,
      name: '',
      address: -1,
    });

    expect(startNode.length).to.equal(1);
    const [node] = startNode;
    const nextPossibleLocations = DebugOperations.stepUntilCall(
      sourceCFGs,
      node,
    );

    expect(nextPossibleLocations.length).to.equal(1);
    const [next] = nextPossibleLocations[0];
    expect(next.sourceLocation.linenr).to.equal(14);
    expect(next.sourceLocation.colnr).to.equal(18);
    expect(zigSource.endsWith(next.sourceLocation.source)).to.equal(true);
  });
});
