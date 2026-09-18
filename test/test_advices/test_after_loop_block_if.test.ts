import { expect } from 'chai';
import assert from 'assert';
import path from 'path';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import {
  isBlockInstruction,
  isIfInstruction,
  isLoopInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';

describe('Registering advices `after` a Loop, Block and If', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', () => {
    const wasmPath = path.resolve(
      './test/data/wat/control_flow_after/control_flow_after.wasm',
    );
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('runs the after-advice of `WasmCode.Struct.Loop`/`WasmCode.Struct.Block`/`WasmCode.Struct.If` only once, after each whole construct (all loop iterations included) has finished', async () => {
    const mainFunc = wasm.getMainFunction();
    const loopInstr = mainFunc.allInstructions.find(isLoopInstruction);
    const ifInstr = mainFunc.allInstructions.find(isIfInstruction);
    assert(loopInstr !== undefined, 'fixture is expected to have a loop');
    assert(ifInstr !== undefined, 'fixture is expected to have an if');

    // `local.set $sum` executes exactly once per loop iteration
    const iterationInstr = loopInstr.subInstructions.find((i) =>
      i.hasOpcode(WasmCode.LocalSet),
    );
    assert(
      iterationInstr !== undefined,
      'expected the loop body to update a local on every iteration',
    );

    const orderCalled: string[] = [];
    analysis.before(iterationInstr, () => orderCalled.push('iteration'));
    // `WasmCode.Struct.Loop`/`WasmCode.Struct.Block`/`WasmCode.Struct.If`
    // are what now carries the "fires once, after the whole structure"
    // semantics that a plain `WasmCode.Loop`/`WasmCode.Block`/`WasmCode.If`
    // (or a direct instance) used to have.
    analysis.after(WasmCode.Struct.Loop, () => orderCalled.push('loop-end'));
    analysis.after(WasmCode.Struct.Block, () => orderCalled.push('block-end'));
    analysis.after(WasmCode.Struct.If, () => orderCalled.push('if-end'));

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    expect(orderCalled).to.deep.equal([
      'iteration',
      'iteration',
      'iteration',
      'iteration',
      'iteration',
      'loop-end',
      'block-end',
      'if-end',
    ]);
  });

  it('runs the after-advice of a direct Loop/Block/If instance (or a plain `WasmCode.Loop`/`WasmCode.Block`/`WasmCode.If`) right on its own opcode instruction, not after the whole construct', async () => {
    const mainFunc = wasm.getMainFunction();
    const loopInstr = mainFunc.allInstructions.find(isLoopInstruction);
    const blockInstr = mainFunc.allInstructions.find(isBlockInstruction);
    const ifInstr = mainFunc.allInstructions.find(isIfInstruction);
    assert(loopInstr !== undefined, 'fixture is expected to have a loop');
    assert(blockInstr !== undefined, 'fixture is expected to have a block');
    assert(ifInstr !== undefined, 'fixture is expected to have an if');

    let loopEntryHits = 0;
    let blockOpcodeHits = 0;
    let ifOpcodeHits = 0;
    analysis.before(loopInstr, () => loopEntryHits++);
    analysis.after(blockInstr, () => blockOpcodeHits++);
    analysis.after(ifInstr, () => ifOpcodeHits++);

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    // All three fire exactly once, at the point their own opcode is
    // reached -- not once per iteration, even though the loop body itself
    // runs several times.
    expect(loopEntryHits).to.equal(1);
    expect(blockOpcodeHits).to.equal(1);
    expect(ifOpcodeHits).to.equal(1);
  });
});

describe('`before`/`after` a plain `WasmCode.Loop`/`WasmCode.Block`/`WasmCode.If` run exactly once, despite the loop iterating several times', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', () => {
    const wasmPath = path.resolve(
      './test/data/wat/control_flow_after/control_flow_after.wasm',
    );
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('fires `before` and `after` of `WasmCode.Loop` exactly once, not once per iteration', async () => {
    const mainFunc = wasm.getMainFunction();
    const loopInstr = mainFunc.allInstructions.find(isLoopInstruction);
    assert(loopInstr !== undefined, 'fixture is expected to have a loop');
    // `local.set $sum` executes exactly once per loop iteration; used here
    // only to confirm the fixture actually loops more than once.
    const iterationInstr = loopInstr.subInstructions.find((i) =>
      i.hasOpcode(WasmCode.LocalSet),
    );
    assert(
      iterationInstr !== undefined,
      'expected the loop body to update a local on every iteration',
    );

    let iterationHits = 0;
    let loopBeforeHits = 0;
    let loopAfterHits = 0;
    analysis.before(iterationInstr, () => iterationHits++);
    analysis.before(WasmCode.Loop, () => loopBeforeHits++);
    analysis.after(WasmCode.Loop, () => loopAfterHits++);

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    // The loop body itself runs several times (sanity check)...
    expect(iterationHits).to.equal(5);
    // ...but `before`/`after` registered on the plain `WasmCode.Loop`
    // opcode each fire exactly once: they are pinned to the Loop opcode
    // itself, which the VM only ever reaches once per entry into the loop.
    expect(loopBeforeHits).to.equal(1);
    expect(loopAfterHits).to.equal(1);
  });

  it('fires `before` and `after` of `WasmCode.Block` exactly once, not once per iteration of the loop it wraps', async () => {
    let blockBeforeHits = 0;
    let blockAfterHits = 0;
    analysis.before(WasmCode.Block, () => blockBeforeHits++);
    analysis.after(WasmCode.Block, () => blockAfterHits++);

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    expect(blockBeforeHits).to.equal(1);
    expect(blockAfterHits).to.equal(1);
  });

  it('fires `before` and `after` of `WasmCode.If` exactly once, matching how many times the if-condition is actually reached', async () => {
    let ifBeforeHits = 0;
    let ifAfterHits = 0;
    analysis.before(WasmCode.If, () => ifBeforeHits++);
    analysis.after(WasmCode.If, () => ifAfterHits++);

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    // `main`'s `if` is reached exactly once (it is not inside the loop),
    // regardless of which branch (`then`/`else`) ends up taken.
    expect(ifBeforeHits).to.equal(1);
    expect(ifAfterHits).to.equal(1);
  });

  it('fires `before` and `after` of `WasmCode.Loop`/`WasmCode.Block`/`WasmCode.If` exactly once each, all registered together', async () => {
    let loopBeforeHits = 0;
    let loopAfterHits = 0;
    let blockBeforeHits = 0;
    let blockAfterHits = 0;
    let ifBeforeHits = 0;
    let ifAfterHits = 0;
    analysis.before(WasmCode.Loop, () => loopBeforeHits++);
    analysis.after(WasmCode.Loop, () => loopAfterHits++);
    analysis.before(WasmCode.Block, () => blockBeforeHits++);
    analysis.after(WasmCode.Block, () => blockAfterHits++);
    analysis.before(WasmCode.If, () => ifBeforeHits++);
    analysis.after(WasmCode.If, () => ifAfterHits++);

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    expect(loopBeforeHits).to.equal(1);
    expect(loopAfterHits).to.equal(1);
    expect(blockBeforeHits).to.equal(1);
    expect(blockAfterHits).to.equal(1);
    expect(ifBeforeHits).to.equal(1);
    expect(ifAfterHits).to.equal(1);
  });
});

describe('`WasmCode.Struct.Block`/`WasmCode.Struct.Loop` hook every occurrence across the module', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', () => {
    const wasmPath = path.resolve(
      './test/data/wat/multi_block_loop/multi_block_loop.wasm',
    );
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('runs `after` once per call for the Loop/Block of every function, not once per iteration', async () => {
    let loopEndHits = 0;
    let blockEndHits = 0;
    analysis.after(WasmCode.Struct.Loop, () => loopEndHits++);
    analysis.after(WasmCode.Struct.Block, () => blockEndHits++);

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    // `main` calls `count_up` and `count_down` once each; each has its own
    // Block wrapping its own Loop (which iterates several times
    // internally), so both counts must be 2, not the iteration count.
    expect(loopEndHits).to.equal(2);
    expect(blockEndHits).to.equal(2);
  });

  it('runs plain `WasmCode.Loop`/`WasmCode.Block` `before` once per call too, pinned to their own opcode', async () => {
    let loopEntryHits = 0;
    let blockEntryHits = 0;
    analysis.before(WasmCode.Loop, () => loopEntryHits++);
    analysis.before(WasmCode.Block, () => blockEntryHits++);

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    expect(loopEntryHits).to.equal(2);
    expect(blockEntryHits).to.equal(2);
  });
});
