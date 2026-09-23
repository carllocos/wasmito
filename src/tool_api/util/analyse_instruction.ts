import assert from 'assert';
import { WasmitoBackendVM } from '../../runtimes/wasmito_vm/wasmito_vm';
import {
  isBlockInstruction,
  isIfInstruction,
  isLoopInstruction,
  WasmAddress,
  WasmInstruction,
} from '../../webassembly/wasm/wasm_instruction';
import { WasmModule } from '../../webassembly/wasm/wasm_module';
import { WasmCode, WasmOpcode } from '../../webassembly/wasm/wasm_opcode';
import { ReadOnlyWasmValue, WritableWasmValue } from '../interrupts';
import { InstrMoment } from '../group_hooks';
import { WasmState, WASMValueIndexed } from '../../webassembly/wasm';
import { assertFatalHookError, SubscriptionContent } from '../../hooks/hook';
import { getGlobalLogger } from '../../logger/logger';
import { WASMFunction } from '../../webassembly/wasm/wasm_function';
import {
  HookOnAddrSubContent,
  HookOnWasmAddrMoment,
  isHookOnAddrSubContent,
} from '../../runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import {
  AdvicesRegistery,
  encodeFunctionReportAddr,
  InstructionHookTarget,
  isNoArgAdvice,
  isVMArgAdvice,
  resolveReportTarget,
  signatureOf,
} from './advices_registery';

const logger = getGlobalLogger();
export function getInstructions<I extends WasmInstruction>(
  wasm: WasmModule,
  instr:
    | I
    | WasmAddress
    | WasmOpcode
    | WasmCode.MultipleOpcode
    | WasmCode.Struct
    | WASMFunction,
  moment: InstrMoment,
): InstructionHookTarget[] {
  let instrs: WasmInstruction[] = [];
  let i: WasmInstruction | undefined;
  let targets: InstructionHookTarget[] = [];
  if (typeof instr === 'number') {
    if (instr >= 0) {
      i = wasm.getInstruction(instr);
    } else if (WasmCode.isStructOpcode(instr)) {
      targets = [...targets, ...structHookTargets(wasm, instr, moment)];
    } else if (WasmCode.isMultipleOpcode(instr)) {
      // group of instructions
      for (const op of WasmCode.toSingleOpcodes(instr)) {
        instrs = [...instrs, ...wasm.instructionsFromOpcode(op)]; // trick to avoid stack exhaustion
      }
    } else {
      throw new Error(`unsupported numeric instr code ${instr}`);
    }
  } else if (instr instanceof WasmInstruction) {
    i = wasm.getInstruction(instr.startAddress);
  } else if (instr instanceof WASMFunction) {
    targets.push(functionHookTarget(instr, moment));
  } else {
    wasm.instructionsFromOpcode(instr).forEach((i) => instrs.push(i));
  }
  if (i !== undefined) {
    instrs.push(i);
  }
  return targets.concat(
    instrs.map((r) => ({
      hookAddr: r.startAddress,
      reportAddr: r.startAddress,
    })),
  );
}

/*
 * Builds the hook target for a `WASMFunction`: the hook itself is placed on
 * the first (`before`) or last (`after`) instruction of the function's body,
 * but what gets reported to the advice callback is the function itself
 * (together with the stack values matching its own signature), not that
 * boundary instruction.
 */
function functionHookTarget(
  f: WASMFunction,
  moment: InstrMoment,
): InstructionHookTarget {
  assert(
    f.body.length > 0,
    `Cannot hook function '${f.name}' since it has an empty body`,
  );
  const boundaryInstr =
    moment === 'before' ? f.body[0] : f.body[f.body.length - 1];
  return {
    hookAddr: boundaryInstr.startAddress,
    reportAddr: encodeFunctionReportAddr(f.id),
  };
}

function structHookTargets(
  wasm: WasmModule,
  structCode: WasmCode.Struct,
  moment: InstrMoment,
): InstructionHookTarget[] {
  switch (structCode) {
    case WasmCode.Struct.Func:
      return wasm.functions.map((f) => functionHookTarget(f, moment));
    case WasmCode.Struct.Block:
      return wasm
        .instructionsFromOpcode(WasmCode.Block)
        .map((i) => structuralControlHookTarget(i, moment));
    case WasmCode.Struct.Loop:
      return wasm
        .instructionsFromOpcode(WasmCode.Loop)
        .map((i) => structuralControlHookTarget(i, moment));
    case WasmCode.Struct.If:
      return wasm
        .instructionsFromOpcode(WasmCode.If)
        .map((i) => structuralControlHookTarget(i, moment));
    default:
      throw new Error(`unsupported struct code ${structCode}`);
  }
}

/*
 * Builds the hook target for the whole Block/Loop/If *structure*, as
 * opposed to its own opcode instruction: `before` a Loop is pinned to the
 * first instruction of its body (so it fires on every iteration), and
 * `after` any of the three is pinned to the structure's matching `end` (for
 * an If, whichever branch was actually taken) -- so it fires once the whole
 * structure (all loop iterations included) has finished -- but all report
 * the Block/Loop/If instruction itself. This is what
 * `WasmCode.Struct.Block`/`WasmCode.Struct.Loop`/`WasmCode.Struct.If`
 * resolve to; a plain `WasmCode.Block`/`WasmCode.Loop`/`WasmCode.If` (or a
 * direct instance) hooks its own opcode instruction instead (see
 * `getInstructions`, which maps every other instruction directly onto its
 * own address).
 */
function structuralControlHookTarget(
  i: WasmInstruction,
  moment: InstrMoment,
): InstructionHookTarget {
  if (moment === 'before' && isLoopInstruction(i)) {
    return {
      hookAddr: i.subInstructions[0].startAddress,
      reportAddr: i.startAddress,
    };
  }
  if (
    moment === 'after' &&
    (isLoopInstruction(i) || isBlockInstruction(i) || isIfInstruction(i))
  ) {
    const endInstr = i.getEndInstruction();
    return {
      hookAddr: endInstr.startAddress,
      reportAddr: i.startAddress,
    };
  }
  return { hookAddr: i.startAddress, reportAddr: i.startAddress };
}

export function instruction<I extends WasmInstruction>(
  advices: AdvicesRegistery,
  moment: 'before',
  instr:
    | I
    | WasmAddress
    | WasmOpcode
    | WasmCode.MultipleOpcode
    | WasmCode.Struct
    | WASMFunction,
  wasm: WasmModule,
  maxTimeoutMs: number,
  cb:
    | ((instr: I, args: ReadOnlyWasmValue[], vm: WasmitoBackendVM) => void)
    | ((
        instr: I,
        args: ReadOnlyWasmValue[],
        vm: WasmitoBackendVM,
      ) => Promise<void>)
    | ((instr: I, args: ReadOnlyWasmValue[]) => void)
    | ((instr: I, args: ReadOnlyWasmValue[]) => Promise<void>)
    | ((vm: WasmitoBackendVM) => void)
    | ((vm: WasmitoBackendVM) => Promise<void>)
    | (() => void)
    | (() => Promise<void>),
  mutate: false,
): number;
export function instruction<I extends WasmInstruction>(
  advices: AdvicesRegistery,
  moment: 'before',
  instr:
    | I
    | WasmAddress
    | WasmOpcode
    | WasmCode.MultipleOpcode
    | WasmCode.Struct
    | WASMFunction,
  wasm: WasmModule,
  maxTimeoutMs: number,
  cb:
    | ((
        instr: I,
        args: WritableWasmValue[],
        vm: WasmitoBackendVM,
      ) => WritableWasmValue[])
    | ((
        instr: I,
        args: WritableWasmValue[],
        vm: WasmitoBackendVM,
      ) => Promise<WritableWasmValue[]>)
    | ((instr: I, args: WritableWasmValue[]) => WritableWasmValue[])
    | ((instr: I, args: WritableWasmValue[]) => Promise<WritableWasmValue[]>),
  mutate: true,
): number;
export function instruction<I extends WasmInstruction>(
  advices: AdvicesRegistery,
  moment: 'after',
  instr:
    | I
    | WasmAddress
    | WasmOpcode
    | WasmCode.MultipleOpcode
    | WasmCode.Struct
    | WASMFunction,
  wasm: WasmModule,
  maxTimeoutMs: number,
  cb:
    | ((
        instr: I,
        result: ReadOnlyWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => void)
    | ((
        instr: I,
        result: ReadOnlyWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => Promise<void>)
    | ((instr: I, result: ReadOnlyWasmValue | undefined) => void)
    | ((instr: I, result: ReadOnlyWasmValue | undefined) => Promise<void>)
    | ((vm: WasmitoBackendVM) => void)
    | ((vm: WasmitoBackendVM) => Promise<void>)
    | (() => void)
    | (() => Promise<void>),
  mutate: false,
): number;
export function instruction<I extends WasmInstruction>(
  advices: AdvicesRegistery,
  moment: 'after',
  instr:
    | I
    | WasmAddress
    | WasmOpcode
    | WasmCode.MultipleOpcode
    | WasmCode.Struct
    | WASMFunction,
  wasm: WasmModule,
  maxTimeoutMs: number,
  cb:
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => WritableWasmValue | undefined)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => Promise<WritableWasmValue | undefined>)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
      ) => WritableWasmValue | undefined)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
      ) => Promise<WritableWasmValue | undefined>),
  mutate: true,
): number;
export function instruction<I extends WasmInstruction>(
  advices: AdvicesRegistery,
  moment: InstrMoment,
  instr:
    | I
    | WasmAddress
    | WasmOpcode
    | WasmCode.MultipleOpcode
    | WasmCode.Struct
    | WASMFunction,
  wasm: WasmModule,
  maxTimeoutMs: number,
  cb:
    | ((
        instr: I,
        args: WritableWasmValue[],
        vm: WasmitoBackendVM,
      ) => WritableWasmValue[])
    | ((
        instr: I,
        args: WritableWasmValue[],
        vm: WasmitoBackendVM,
      ) => Promise<WritableWasmValue[]>)
    | ((instr: I, args: WritableWasmValue[]) => WritableWasmValue[])
    | ((instr: I, args: WritableWasmValue[]) => Promise<WritableWasmValue[]>)
    | ((instr: I, args: ReadOnlyWasmValue[], vm: WasmitoBackendVM) => void)
    | ((
        instr: I,
        args: ReadOnlyWasmValue[],
        vm: WasmitoBackendVM,
      ) => Promise<void>)
    | ((instr: I, args: ReadOnlyWasmValue[]) => void)
    | ((instr: I, args: ReadOnlyWasmValue[]) => Promise<void>)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => WritableWasmValue | undefined)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => Promise<WritableWasmValue | undefined>)
    | ((
        instr: I,
        result: ReadOnlyWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => void)
    | ((
        instr: I,
        result: ReadOnlyWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => Promise<void>)
    | ((instr: I, result: ReadOnlyWasmValue | undefined) => void)
    | ((instr: I, result: ReadOnlyWasmValue | undefined) => Promise<void>)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
      ) => WritableWasmValue | undefined)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
      ) => Promise<WritableWasmValue | undefined>)
    | ((vm: WasmitoBackendVM) => void)
    | ((vm: WasmitoBackendVM) => Promise<void>)
    | (() => void)
    | (() => Promise<void>),
  mutate: boolean,
): number {
  const instrs = getInstructions(wasm, instr, moment);
  const hm = instrMomentToHookMoment(moment);
  return advices.addInstructionsAdvice(hm, instrs, mutate, cb, wasm);
}

function instrMomentToHookMoment(m: InstrMoment): HookOnWasmAddrMoment {
  switch (m) {
    case 'before':
      return HookOnWasmAddrMoment.HookBefore;
    case 'after':
      return HookOnWasmAddrMoment.HookAfter;
    default:
      throw new Error(`TODO`);
  }
}

type StackArgs = WASMValueIndexed[] | WASMValueIndexed | undefined;

function copyArgsFromStack(
  target: WasmInstruction | WASMFunction,
  stack: WASMValueIndexed[],
  moment: HookOnWasmAddrMoment,
): StackArgs {
  const signature = signatureOf(target);
  switch (moment) {
    case HookOnWasmAddrMoment.HookBefore: {
      assertFatalHookError(
        stack.length >= signature.nrArgs,
        `VM failed to provide the stack needed to construct args. Expected stack size ${signature.nrArgs}. Given stack size ${stack.length}`,
      );
      /*
       * For a plain instruction, `before` reports the top of the real
       * operand stack: the args it is about to consume sit at the end.
       * For a WASMFunction (or WasmCode.Struct.Func, which resolves to one)
       * that takes arguments, the VM instead reports every active call
       * frame's locals concatenated (oldest/outermost first), each frame
       * laid out as its own params followed by its own declared locals. The
       * current (innermost) frame is therefore the LAST
       * `target.locals.length` entries of the reported stack, and that
       * frame's params are the first `nrArgs` entries within that slice --
       * not simply the last `nrArgs` entries of the whole array (which, for
       * a recursive call, would belong to an outer frame, and for a
       * function with locals of its own, would be those locals instead of
       * the actual params). The stack is only requested (see
       * `getInspectState`) when the WASMFunction takes arguments, so this
       * frame-aware slicing only applies in that case; a zero-arg
       * WASMFunction (with or without locals) always reports no args.
       */
      let args: WASMValueIndexed[];
      if (target instanceof WASMFunction && signature.nrArgs > 0) {
        const frameWidth = target.locals.length;
        assertFatalHookError(
          stack.length >= frameWidth,
          `VM failed to provide the current call frame for '${target.name}'. Expected at least ${frameWidth} entries (params + locals), given ${stack.length}`,
        );
        const frameStart = stack.length - frameWidth;
        args = stack.slice(frameStart, frameStart + signature.nrArgs);
      } else {
        args = stack.slice(-signature.nrArgs);
      }
      return args.map((v: WASMValueIndexed) => {
        return {
          type: v.type,
          value: v.value,
          idx: v.idx,
        };
      });
    }

    case HookOnWasmAddrMoment.HookAfter: {
      assertFatalHookError(
        stack.length >= signature.nrResults,
        `Stack has not the expected number of values to read result for '${target.name}'`,
      );

      if (stack.length === 0) return undefined;

      const v = stack[stack.length - 1];
      return {
        type: v.type,
        value: v.value,
        idx: v.idx,
      };
    }
    default:
      throw new Error(`TODO`);
  }
}

export function runAdvicesInstruction(
  advicesContainer: AdvicesRegistery,
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  mod: WasmModule,
  onAdviceFailure: (reason?: any) => void,
): (
  sub: SubscriptionContent<HookOnAddrSubContent, WasmState>,
) => Promise<void> {
  return async (sub: SubscriptionContent<HookOnAddrSubContent, WasmState>) => {
    return advicesContainer.mutexInstructions.runExclusive(async () => {
      const metadata = sub.metadata;
      assert(isHookOnAddrSubContent(metadata), `no valid subscribe msg`);
      const i = mod.getInstruction(metadata.addr);
      assertFatalHookError(
        i !== undefined,
        `No instruction found for address ${metadata.addr}`,
      );

      const moment = metadata.moment;
      const advices = advicesContainer.getAdvices(moment, metadata.addr);
      const wasmState = sub.sub;
      const firstReportTarget = resolveReportTarget(mod, advices[0].reportAddr);
      const stackArgs = copyArgsFromStack(
        firstReportTarget,
        wasmState.stack ?? [],
        moment,
      );
      let mutated = false;
      let argsCB: AdviceArgsCB;
      for (let adviceIdx = 0; adviceIdx < advices.length; adviceIdx++) {
        if (vm.isClosed()) break;

        const { advice, mutate, reportAddr } = advices[adviceIdx];
        mutated = mutate || mutated;
        argsCB = prepareArgsCB(stackArgs, argsCB, mutate);
        let newArgs;
        try {
          if (isNoArgAdvice(advice)) {
            await advice();
          } else if (isVMArgAdvice(advice)) {
            await advice(vm);
          } else {
            const reportTarget = resolveReportTarget(mod, reportAddr);
            newArgs = await advice(reportTarget as any, argsCB as any, vm);
          }
        } catch (e) {
          onAdviceFailure(e);
          return;
        }
        // assertArgsValidity(stackArgs, newArgs, mutate);
        if (mutate) argsCB = newArgs as any;
      }
      if (mutated && !vm.isClosed()) {
        if (argsCB !== undefined) {
          let as: ReadOnlyWasmValue[] | WritableWasmValue[];
          if (argsCB instanceof Array) {
            as = argsCB;
          } else if (argsCB instanceof ReadOnlyWasmValue) {
            as = [argsCB];
          } else {
            as = [argsCB];
          }
          const success = await updateArgsStack(as, vm);
          assert(success, 'failed to update the stack with new values');
        }
        logger.debug('Resume execution on VM');
        await vm.run(maxTimeoutMs);
      }
    });
  };
}

type AdviceArgsCB =
  | ReadOnlyWasmValue[]
  | ReadOnlyWasmValue
  | WritableWasmValue[]
  | WritableWasmValue
  | undefined;

function prepareArgsCB(
  stackArgs: StackArgs,
  adviceArgs: AdviceArgsCB,
  mutate: boolean,
): AdviceArgsCB {
  if (stackArgs === undefined) return undefined;

  if (adviceArgs === undefined) {
    const args = stackToAdviceArgs(
      stackArgs instanceof Array ? stackArgs : [stackArgs],
      mutate,
    );
    return stackArgs instanceof Array ? args : args[0];
  }

  return adviceArgToAdviceArg(adviceArgs, mutate);
}

function stackToAdviceArgs(
  args: WASMValueIndexed[],
  write: boolean,
): ReadOnlyWasmValue[] | WritableWasmValue[] {
  if (write)
    return args.map((a) => WritableWasmValue.new(a.type, a.value, a.idx));
  else return args.map((a) => ReadOnlyWasmValue.new(a.type, a.value, a.idx));
}

function adviceArgToAdviceArg(
  args: AdviceArgsCB,
  toWrite: boolean,
): AdviceArgsCB {
  if (args === undefined) {
    return undefined;
  }

  if (args instanceof WritableWasmValue) {
    if (toWrite) return args;
    else return ReadOnlyWasmValue.new(args.type, args.value, args.stackIdx);
  }

  if (args instanceof ReadOnlyWasmValue) {
    if (toWrite)
      return WritableWasmValue.new(args.type, args.value, args.stackIdx);
    else return args;
  }

  if (args.length === 0) return [];

  if (args[0] instanceof WritableWasmValue) {
    if (toWrite) return args;
    const newArgs: ReadOnlyWasmValue[] = [];
    for (const arg of args)
      newArgs.push(ReadOnlyWasmValue.new(arg.type, arg.value, arg.stackIdx));
    return newArgs;
  } else {
    if (!toWrite) return args;
    const newArgs: WritableWasmValue[] = [];

    for (const arg of args)
      newArgs.push(WritableWasmValue.new(arg.type, arg.value, arg.stackIdx));
    return newArgs;
  }
}

async function updateArgsStack(
  args: WritableWasmValue[] | ReadOnlyWasmValue[],
  vm: WasmitoBackendVM,
): Promise<boolean> {
  for (const arg of args) {
    // console.log(
    //   `{idx:${arg.stackIdx},type:${WASM.typeToString(arg.type)},value:${arg.value}}`,
    // );
    const s = await vm.updateStackValue(arg.stackIdx, arg.toWasmValue());
    if (!s) return false;
    // const newS = await vm.inspect(new StateRequest().includeStack());
    // const stack = newS.stack;
    // assert(stack !== undefined);
    // const v = stack[arg.stackIdx];
    // assert(v.idx === arg.stackIdx);
    // assert(v.type === arg.type);
    // if (v.value !== arg.value) {
    //   assert(v.value === arg.value);
    // }
  }
  return true;
}
