/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import {
  ReadOnlyWasmValue,
  WritableWasmValue,
} from '../../src/tool_api/interrupts';

/*
 * Compile-time only: `before`/`beforeMut`/`after`/`afterMut` are overloaded
 * so that when the hook target is a `WASMFunction` (or `WasmCode.Struct`,
 * which resolves to one), the callback's first parameter must be typed as
 * `WASMFunction` -- not `WasmInstruction` -- and vice versa for every other
 * kind of target (an instruction, address, opcode or `WasmCode.MultipleOpcode`).
 *
 * None of the statements below ever run: `typeChecksOnly` is declared but
 * never called, purely so `tsc` type-checks its body. The `@ts-expect-error`
 * lines assert that misusing the API is a compile error -- `tsc` itself
 * fails the build if a flagged line stops erroring (an "unused
 * '@ts-expect-error' directive" error), so this doubles as a regression
 * test for the overloads.
 */
function typeChecksOnly(
  analysis: WasmAnalysis,
  fn: WASMFunction,
  instr: WasmInstruction,
): void {
  // Valid: a WASMFunction (or WasmCode.Struct.Func) target's callback takes a WASMFunction.
  analysis.before(fn, (f: WASMFunction, _args: ReadOnlyWasmValue[]) => {
    f.id;
  });
  analysis.before(
    WasmCode.Struct.Func,
    (f: WASMFunction, _args: ReadOnlyWasmValue[]) => {
      f.id;
    },
  );
  analysis.after(
    fn,
    (f: WASMFunction, _result: ReadOnlyWasmValue | undefined) => {
      f.id;
    },
  );
  analysis.beforeMut(fn, (f: WASMFunction, args: WritableWasmValue[]) => {
    f.id;
    return args;
  });
  analysis.afterMut(
    fn,
    (f: WASMFunction, result: WritableWasmValue | undefined) => {
      f.id;
      return result;
    },
  );

  // Valid: a plain instruction/address/opcode target's callback takes a WasmInstruction.
  analysis.before(instr, (i: WasmInstruction, _args: ReadOnlyWasmValue[]) => {
    i.startAddress;
  });
  analysis.after(
    instr,
    (i: WasmInstruction, _result: ReadOnlyWasmValue | undefined) => {
      i.startAddress;
    },
  );

  // @ts-expect-error a WASMFunction target's callback must take a WASMFunction, not a WasmInstruction
  analysis.before(fn, (_i: WasmInstruction, _args: ReadOnlyWasmValue[]) => {});

  // @ts-expect-error same for `after`
  analysis.after(
    fn,
    (_i: WasmInstruction, _result: ReadOnlyWasmValue | undefined) => {},
  );

  // @ts-expect-error same for `beforeMut`
  analysis.beforeMut(fn, (_i: WasmInstruction, args: WritableWasmValue[]) => {
    return args;
  });

  // @ts-expect-error same for `afterMut`
  analysis.afterMut(
    fn,
    (_i: WasmInstruction, result: WritableWasmValue | undefined) => {
      return result;
    },
  );

  // @ts-expect-error a plain instruction target's callback must take a WasmInstruction, not a WASMFunction
  analysis.before(instr, (_f: WASMFunction, _args: ReadOnlyWasmValue[]) => {});

  // NOTE on a residual gap: `WasmCode.Struct` (like `WasmCode.MultipleOpcode`)
  // is a *numeric* enum, and every numeric enum member is structurally a
  // subtype of `number` = `WasmAddress`. So a `WasmCode.Struct.Func` value
  // also satisfies the generic overload's plain-address branch, and TS
  // cannot reject an explicitly-mistyped callback there the way it does for
  // a `WASMFunction` value (which shares no such structural overlap with
  // `WasmAddress`/`WasmOpcode`/`WasmInstruction`). This is NOT expected to
  // error -- it is accepted by the generic overload via that numeric
  // widening:
  analysis.before(
    WasmCode.Struct.Func,
    (_i: WasmInstruction, _args: ReadOnlyWasmValue[]) => {},
  );
}

describe('WasmAnalysis before/beforeMut/after/afterMut overload types', () => {
  it('compiles only when each callback matches its target (see typeChecksOnly, checked by `tsc` above)', () => {
    expect(typeof typeChecksOnly).to.equal('function');
  });
});
