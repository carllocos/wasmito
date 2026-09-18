import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { isLoopInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { getInstructions } from '../../src/tool_api/util/analyse_instruction';
import {
  encodeFunctionReportAddr,
  resolveReportTarget,
  signatureOf,
} from '../../src/tool_api/util/advices_registery';

describe('Resolving the hook target for a WASMFunction and WasmCode.Struct.Func', function () {
  const wasmPath = path.resolve('./test/data/wat/fac/fac.wasm');
  const wasm = new WasmModule(wasmPath);
  const factorial = wasm.getFunction(0)!;
  const main = wasm.getMainFunction();

  it('hooks `before` a WASMFunction at its first body instruction, but reports the function itself', () => {
    const [target] = getInstructions(wasm, factorial, 'before');
    expect(target.hookAddr).to.equal(factorial.body[0].startAddress);
    expect(target.reportAddr).to.equal(encodeFunctionReportAddr(factorial.id));

    const resolved = resolveReportTarget(wasm, target.reportAddr);
    expect(resolved).to.equal(factorial);
    expect(signatureOf(resolved)).to.equal(factorial.type);
  });

  it('hooks `after` a WASMFunction at its last body instruction, but reports the function itself', () => {
    const [target] = getInstructions(wasm, factorial, 'after');
    expect(target.hookAddr).to.equal(
      factorial.body[factorial.body.length - 1].startAddress,
    );
    expect(target.reportAddr).to.equal(encodeFunctionReportAddr(factorial.id));

    const resolved = resolveReportTarget(wasm, target.reportAddr);
    expect(resolved).to.equal(factorial);
  });

  it('`WasmCode.Struct.Func` applies the same `before` hook to every function of the module', () => {
    const targets = getInstructions(wasm, WasmCode.Struct.Func, 'before');
    expect(targets.length).to.equal(wasm.functions.length);

    for (const f of wasm.functions) {
      const [expected] = getInstructions(wasm, f, 'before');
      const found = targets.find(
        (t) => t.reportAddr === encodeFunctionReportAddr(f.id),
      );
      expect(found).to.deep.equal(expected);
    }
  });

  it('`WasmCode.Struct.Func` applies the same `after` hook to every function of the module', () => {
    const targets = getInstructions(wasm, WasmCode.Struct.Func, 'after');
    expect(targets.length).to.equal(wasm.functions.length);

    for (const f of wasm.functions) {
      const [expected] = getInstructions(wasm, f, 'after');
      const found = targets.find(
        (t) => t.reportAddr === encodeFunctionReportAddr(f.id),
      );
      expect(found).to.deep.equal(expected);
    }
  });

  it('sanity check: `main` is amongst the module functions targeted by `WasmCode.Struct.Func`', () => {
    const targets = getInstructions(wasm, WasmCode.Struct.Func, 'before');
    const mainTarget = targets.find(
      (t) => t.reportAddr === encodeFunctionReportAddr(main.id),
    );
    expect(mainTarget).to.not.equal(undefined);
    expect(mainTarget!.hookAddr).to.equal(main.body[0].startAddress);
  });
});

describe('`before` a WASMFunction whose first body instruction is itself a Loop', function () {
  const wasmPath = path.resolve(
    './test/data/wat/loop_first_instr/loop_first_instr.wasm',
  );
  const wasm = new WasmModule(wasmPath);
  const loopy = wasm.functions.find((f) => f.name === 'loopy')!;

  it('fixture sanity check: the first body instruction is a bare Loop', () => {
    expect(loopy).to.not.equal(undefined);
    expect(isLoopInstruction(loopy.body[0])).to.equal(true);
  });

  it('pins the hook to the Loop`s own address, same as a direct `before` hook on that same Loop, unlike `WasmCode.Struct.Loop`', () => {
    const loopInstr = loopy.body[0];

    // A direct `before` hook on the Loop instruction itself is pinned to
    // its own opcode address (see `toInstructionHookTarget`), so it fires
    // exactly once, at function entry.
    const [directLoopTarget] = getInstructions(wasm, loopInstr, 'before');
    expect(directLoopTarget.hookAddr).to.equal(loopInstr.startAddress);

    // Hooking `before` the whole function is pinned to that same Loop's
    // own opcode address for the same reason: the function's first body
    // instruction just happens to be that Loop.
    const [functionTarget] = getInstructions(wasm, loopy, 'before');
    expect(functionTarget.hookAddr).to.equal(loopInstr.startAddress);
    expect(functionTarget.hookAddr).to.equal(directLoopTarget.hookAddr);
    expect(functionTarget.reportAddr).to.equal(
      encodeFunctionReportAddr(loopy.id),
    );

    // Only `WasmCode.Struct.Loop` redirects `before` to the first
    // sub-instruction of the Loop's body, so it fires on every iteration.
    const [structLoopTarget] = getInstructions(
      wasm,
      WasmCode.Struct.Loop,
      'before',
    );
    expect(structLoopTarget.hookAddr).to.equal(
      loopInstr.subInstructions[0].startAddress,
    );
    expect(structLoopTarget.hookAddr).to.not.equal(directLoopTarget.hookAddr);
  });
});
