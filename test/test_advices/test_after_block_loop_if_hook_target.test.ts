import { expect } from 'chai';
import assert from 'assert';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { isIfInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { getInstructions } from '../../src/tool_api/util/analyse_instruction';

describe('Resolving the hook target for `after` a Loop, Block and If', function () {
  const wasmPath = path.resolve(
    './test/data/wat/control_flow_after/control_flow_after.wasm',
  );
  const wasm = new WasmModule(wasmPath);

  it('hooks `after` a plain Loop directly on its own opcode instruction, reporting itself', () => {
    const loopInstr = wasm.instructionsFromOpcode(WasmCode.Loop)[0];

    const [target] = getInstructions(wasm, loopInstr, 'after');
    expect(target.hookAddr).to.equal(loopInstr.startAddress);
    expect(target.reportAddr).to.equal(loopInstr.startAddress);
  });

  it('hooks `after` a plain Block directly on its own opcode instruction, reporting itself', () => {
    const blockInstr = wasm.instructionsFromOpcode(WasmCode.Block)[0];

    const [target] = getInstructions(wasm, blockInstr, 'after');
    expect(target.hookAddr).to.equal(blockInstr.startAddress);
    expect(target.reportAddr).to.equal(blockInstr.startAddress);
  });

  it('`WasmCode.Struct.Loop` hooks `after` at the `end` instruction instead, but still reports the Loop instruction itself', () => {
    const loopInstr = wasm.instructionsFromOpcode(WasmCode.Loop)[0];
    const endInstr =
      loopInstr.subInstructions[loopInstr.subInstructions.length - 1];
    expect(endInstr.hasOpcode(WasmCode.End)).to.equal(true);

    const [target] = getInstructions(wasm, WasmCode.Struct.Loop, 'after');
    expect(target.hookAddr).to.equal(endInstr.startAddress);
    expect(target.reportAddr).to.equal(loopInstr.startAddress);
  });

  it('`WasmCode.Struct.Block` hooks `after` at the `end` instruction instead, but still reports the Block instruction itself', () => {
    const blockInstr = wasm.instructionsFromOpcode(WasmCode.Block)[0];
    const endInstr =
      blockInstr.subInstructions[blockInstr.subInstructions.length - 1];
    expect(endInstr.hasOpcode(WasmCode.End)).to.equal(true);

    const [target] = getInstructions(wasm, WasmCode.Struct.Block, 'after');
    expect(target.hookAddr).to.equal(endInstr.startAddress);
    expect(target.reportAddr).to.equal(blockInstr.startAddress);
  });

  it('hooks `after` a plain If (with or without an else-branch) directly on its own opcode instruction, reporting itself', () => {
    const ifWithElse = wasm
      .instructionsFromOpcode(WasmCode.If)
      .filter(isIfInstruction)
      .find((i) => i.hasAlternativeBlock());
    const ifNoElse = wasm
      .instructionsFromOpcode(WasmCode.If)
      .filter(isIfInstruction)
      .find((i) => !i.hasAlternativeBlock());
    assert(ifWithElse !== undefined, 'fixture is expected to have an if-else');
    assert(
      ifNoElse !== undefined,
      'fixture is expected to have an if without an else',
    );

    for (const ifInstr of [ifWithElse, ifNoElse]) {
      const [target] = getInstructions(wasm, ifInstr, 'after');
      expect(target.hookAddr).to.equal(ifInstr.startAddress);
      expect(target.reportAddr).to.equal(ifInstr.startAddress);
    }
  });

  it('`WasmCode.Struct.If` hooks `after` an If with an else-branch at the `end` closing the alternative instead, but still reports the If instruction itself', () => {
    const ifWithElse = wasm
      .instructionsFromOpcode(WasmCode.If)
      .filter(isIfInstruction)
      .find((i) => i.hasAlternativeBlock());
    assert(ifWithElse !== undefined, 'fixture is expected to have an if-else');
    const endInstr = ifWithElse.alternative[ifWithElse.alternative.length - 1];
    expect(endInstr.hasOpcode(WasmCode.End)).to.equal(true);

    const targets = getInstructions(wasm, WasmCode.Struct.If, 'after');
    const target = targets.find(
      (t) => t.reportAddr === ifWithElse.startAddress,
    );
    expect(target).to.not.equal(undefined);
    expect(target!.hookAddr).to.equal(endInstr.startAddress);
  });

  it('`WasmCode.Struct.If` hooks `after` an If without an else-branch at the `end` closing the consequence instead, but still reports the If instruction itself', () => {
    const ifNoElse = wasm
      .instructionsFromOpcode(WasmCode.If)
      .filter(isIfInstruction)
      .find((i) => !i.hasAlternativeBlock());
    assert(
      ifNoElse !== undefined,
      'fixture is expected to have an if without an else',
    );
    const endInstr = ifNoElse.consequence[ifNoElse.consequence.length - 1];
    expect(endInstr.hasOpcode(WasmCode.End)).to.equal(true);

    const targets = getInstructions(wasm, WasmCode.Struct.If, 'after');
    const target = targets.find((t) => t.reportAddr === ifNoElse.startAddress);
    expect(target).to.not.equal(undefined);
    expect(target!.hookAddr).to.equal(endInstr.startAddress);
  });

  it('`WasmCode.Struct.If` applies its `after` hook to every If of the module (both branch shapes)', () => {
    const ifInstrs = wasm
      .instructionsFromOpcode(WasmCode.If)
      .filter(isIfInstruction);
    expect(ifInstrs.length).to.equal(2);

    const targets = getInstructions(wasm, WasmCode.Struct.If, 'after');
    expect(targets.length).to.equal(ifInstrs.length);
  });

  it('hooks `before` a plain Loop directly on its own opcode instruction, reporting itself', () => {
    const loopInstr = wasm.instructionsFromOpcode(WasmCode.Loop)[0];
    const [target] = getInstructions(wasm, loopInstr, 'before');
    expect(target.hookAddr).to.equal(loopInstr.startAddress);
    expect(target.reportAddr).to.equal(loopInstr.startAddress);
  });

  it('`WasmCode.Struct.Loop` hooks `before` at the first sub-instruction instead, so it fires on every iteration', () => {
    const loopInstr = wasm.instructionsFromOpcode(WasmCode.Loop)[0];
    const [target] = getInstructions(wasm, WasmCode.Struct.Loop, 'before');
    expect(target.hookAddr).to.equal(loopInstr.subInstructions[0].startAddress);
    expect(target.reportAddr).to.equal(loopInstr.startAddress);
  });
});

describe('`WasmCode.Struct.Block`/`WasmCode.Struct.Loop` apply their hook to every occurrence in the module', function () {
  const wasmPath = path.resolve(
    './test/data/wat/multi_block_loop/multi_block_loop.wasm',
  );
  const wasm = new WasmModule(wasmPath);

  it('`WasmCode.Struct.Block` applies the same `after` hook to every Block of the module', () => {
    const blockInstrs = wasm.instructionsFromOpcode(WasmCode.Block);
    expect(blockInstrs.length).to.equal(2);

    const targets = getInstructions(wasm, WasmCode.Struct.Block, 'after');
    expect(targets.length).to.equal(blockInstrs.length);

    for (const blockInstr of blockInstrs) {
      const [expected] = getInstructions(wasm, blockInstr, 'after');
      const endInstr =
        blockInstr.subInstructions[blockInstr.subInstructions.length - 1];
      const found = targets.find(
        (t) => t.reportAddr === blockInstr.startAddress,
      );
      expect(found).to.not.equal(undefined);
      expect(found!.hookAddr).to.equal(endInstr.startAddress);
      expect(found!.hookAddr).to.not.equal(expected.hookAddr);
    }
  });

  it('`WasmCode.Struct.Loop` applies the same `before` hook to every Loop of the module', () => {
    const loopInstrs = wasm.instructionsFromOpcode(WasmCode.Loop);
    expect(loopInstrs.length).to.equal(2);

    const targets = getInstructions(wasm, WasmCode.Struct.Loop, 'before');
    expect(targets.length).to.equal(loopInstrs.length);

    for (const loopInstr of loopInstrs) {
      const [expected] = getInstructions(wasm, loopInstr, 'before');
      const found = targets.find(
        (t) => t.reportAddr === loopInstr.startAddress,
      );
      expect(found).to.not.equal(undefined);
      expect(found!.hookAddr).to.equal(
        loopInstr.subInstructions[0].startAddress,
      );
      expect(found!.hookAddr).to.not.equal(expected.hookAddr);
    }
  });

  it('plain `WasmCode.Block`/`WasmCode.Loop` apply their hook to every occurrence too, each pinned to its own opcode address', () => {
    const blockTargets = getInstructions(wasm, WasmCode.Block, 'after');
    const loopTargets = getInstructions(wasm, WasmCode.Loop, 'before');
    expect(blockTargets.length).to.equal(2);
    expect(loopTargets.length).to.equal(2);

    for (const t of blockTargets) expect(t.hookAddr).to.equal(t.reportAddr);
    for (const t of loopTargets) expect(t.hookAddr).to.equal(t.reportAddr);
  });
});
