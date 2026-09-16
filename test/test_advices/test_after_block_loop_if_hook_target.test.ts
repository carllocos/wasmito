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

  it('hooks `after` a Loop at its `end` instruction, but reports the Loop instruction itself', () => {
    const loopInstr = wasm.instructionsFromOpcode(WasmCode.Loop)[0];
    const endInstr =
      loopInstr.subInstructions[loopInstr.subInstructions.length - 1];
    expect(endInstr.hasOpcode(WasmCode.End)).to.equal(true);

    const [target] = getInstructions(wasm, loopInstr, 'after');
    expect(target.hookAddr).to.equal(endInstr.startAddress);
    expect(target.reportAddr).to.equal(loopInstr.startAddress);
  });

  it('hooks `after` a Block at its `end` instruction, but reports the Block instruction itself', () => {
    const blockInstr = wasm.instructionsFromOpcode(WasmCode.Block)[0];
    const endInstr =
      blockInstr.subInstructions[blockInstr.subInstructions.length - 1];
    expect(endInstr.hasOpcode(WasmCode.End)).to.equal(true);

    const [target] = getInstructions(wasm, blockInstr, 'after');
    expect(target.hookAddr).to.equal(endInstr.startAddress);
    expect(target.reportAddr).to.equal(blockInstr.startAddress);
  });

  it('hooks `after` an If with an else-branch at the `end` closing the alternative', () => {
    const ifWithElse = wasm
      .instructionsFromOpcode(WasmCode.If)
      .filter(isIfInstruction)
      .find((i) => i.hasAlternativeBlock());
    assert(ifWithElse !== undefined, 'fixture is expected to have an if-else');
    const endInstr = ifWithElse.alternative[ifWithElse.alternative.length - 1];
    expect(endInstr.hasOpcode(WasmCode.End)).to.equal(true);

    const [target] = getInstructions(wasm, ifWithElse, 'after');
    expect(target.hookAddr).to.equal(endInstr.startAddress);
    expect(target.reportAddr).to.equal(ifWithElse.startAddress);
  });

  it('hooks `after` an If without an else-branch at the `end` closing the consequence', () => {
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

    const [target] = getInstructions(wasm, ifNoElse, 'after');
    expect(target.hookAddr).to.equal(endInstr.startAddress);
    expect(target.reportAddr).to.equal(ifNoElse.startAddress);
  });

  it('still hooks `before` a Loop at its first sub-instruction (regression check)', () => {
    const loopInstr = wasm.instructionsFromOpcode(WasmCode.Loop)[0];
    const [target] = getInstructions(wasm, loopInstr, 'before');
    expect(target.hookAddr).to.equal(loopInstr.subInstructions[0].startAddress);
    expect(target.reportAddr).to.equal(loopInstr.startAddress);
  });
});
