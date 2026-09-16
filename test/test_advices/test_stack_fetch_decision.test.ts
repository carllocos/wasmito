import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import {
  AdvicesRegistery,
  encodeFunctionReportAddr,
  InstructionHookTarget,
} from '../../src/tool_api/util/advices_registery';
import { HookOnWasmAddrMoment } from '../../src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import { InspectableState } from '../../src/runtimes/wasmito_vm/requests/inspect_request';
import { InspectStateHook } from '../../src/hooks/hook_inspect_state';

/*
 * When a hook is redirected onto a different physical instruction `x`
 * (e.g. `before` a Loop hooks its first sub-instruction, `before`/`after` a
 * WASMFunction hooks its first/last body instruction), the decision of
 * whether the VM's `stack` needs to be fetched at all must be driven
 * exclusively by the *reported* target's own signature (the Loop, Block,
 * If, WASMFunction or Struct target), never by `x`'s own signature. These
 * tests confirm that hypothesis directly against `AdvicesRegistery`,
 * independently of any real VM.
 */
function includesStack(
  registery: AdvicesRegistery,
  hookAddr: number,
): boolean {
  const req = registery.instructionsRequest.find(
    (r) => r.wasmAddr === hookAddr,
  );
  expect(req, `no request registered for hookAddr ${hookAddr}`).to.not.equal(
    undefined,
  );
  expect(req!.hook, `request for hookAddr ${hookAddr} has no hook`).to.not
    .equal(undefined);
  const hook = req!.hook as InspectStateHook<unknown>;
  return hook.doesInclude(InspectableState.stackState);
}

describe('Stack-fetch decision is driven by the report target, not by the redirected hook instruction `x`', function () {
  describe('`before` (args)', function () {
    const wasm = new WasmModule(path.resolve('./test/data/wat/fac/fac.wasm'));
    const factorial = wasm.getFunction(0)!;
    const main = wasm.getMainFunction();

    it('fetches the stack when the report target takes args, even though `x` itself takes none', () => {
      const x = factorial.body[0]; // `local.get $n`: nrArgs = 0
      expect(x.signature.nrArgs).to.equal(0);
      expect(factorial.type.nrArgs).to.equal(1);

      const registery = new AdvicesRegistery();
      const target: InstructionHookTarget = {
        hookAddr: x.startAddress,
        reportAddr: encodeFunctionReportAddr(factorial.id),
      };
      registery.addInstructionsAdvice(
        HookOnWasmAddrMoment.HookBefore,
        [target],
        false,
        (_f: any, _args: any) => {},
        wasm,
      );

      expect(includesStack(registery, x.startAddress)).to.equal(true);
    });

    it('does not fetch the stack when the report target takes no args, even though `x` itself takes some', () => {
      const x = factorial.allInstructions.find((i) =>
        i.hasOpcode(WasmCode.I32Sub),
      )!;
      expect(x).to.not.equal(undefined);
      expect(x.signature.nrArgs).to.equal(2);
      expect(main.type.nrArgs).to.equal(0);

      const registery = new AdvicesRegistery();
      const target: InstructionHookTarget = {
        hookAddr: x.startAddress,
        reportAddr: encodeFunctionReportAddr(main.id),
      };
      registery.addInstructionsAdvice(
        HookOnWasmAddrMoment.HookBefore,
        [target],
        false,
        (_f: any, _args: any) => {},
        wasm,
      );

      expect(includesStack(registery, x.startAddress)).to.equal(false);
    });
  });

  describe('`after` (results)', function () {
    const wasm = new WasmModule(
      path.resolve(
        './test/data/wat/control_flow_after/control_flow_after.wasm',
      ),
    );
    const main = wasm.getMainFunction();
    const ifNoElse = wasm.functions.find((f) => f.name === 'if_no_else')!;

    it('fetches the stack when the report target produces a result, even though `x` itself produces none', () => {
      const x = main.instructionsFromOpcode(WasmCode.LocalSet)[0];
      expect(x).to.not.equal(undefined);
      expect(x.signature.nrResults).to.equal(0);
      expect(main.type.nrResults).to.equal(1);

      const registery = new AdvicesRegistery();
      const target: InstructionHookTarget = {
        hookAddr: x.startAddress,
        reportAddr: encodeFunctionReportAddr(main.id),
      };
      registery.addInstructionsAdvice(
        HookOnWasmAddrMoment.HookAfter,
        [target],
        false,
        (_f: any, _result: any) => {},
        wasm,
      );

      expect(includesStack(registery, x.startAddress)).to.equal(true);
    });

    it('does not fetch the stack when the report target produces no result, even though `x` itself produces one', () => {
      expect(ifNoElse).to.not.equal(undefined);
      const x = ifNoElse.instructionsFromOpcode(WasmCode.I32Eqz)[0];
      expect(x).to.not.equal(undefined);
      expect(x.signature.nrResults).to.equal(1);
      expect(ifNoElse.type.nrResults).to.equal(0);

      const registery = new AdvicesRegistery();
      const target: InstructionHookTarget = {
        hookAddr: x.startAddress,
        reportAddr: encodeFunctionReportAddr(ifNoElse.id),
      };
      registery.addInstructionsAdvice(
        HookOnWasmAddrMoment.HookAfter,
        [target],
        false,
        (_f: any, _result: any) => {},
        wasm,
      );

      expect(includesStack(registery, x.startAddress)).to.equal(false);
    });
  });
});
