import assert from 'assert';
import { WasmitoBackendVM } from '../../runtimes/wasmito_vm/wasmito_vm';
import {
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
  isNoArgAdvice,
  isVMArgAdvice,
} from './advices_registery';

const logger = getGlobalLogger();
export function getInstructions<I extends WasmInstruction>(
  wasm: WasmModule,
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
  moment: InstrMoment,
): WasmInstruction[] {
  let instrs: WasmInstruction[] = [];
  let i: WasmInstruction | undefined;
  if (typeof instr === 'number') {
    if (instr >= 0) {
      i = wasm.getInstruction(instr);
    } else {
      // group of instructions
      for (const op of WasmCode.toSingleOpcodes(instr)) {
        instrs = [...instrs, ...wasm.instructionsFromOpcode(op)]; // trick to avoid stack exhaustion
      }
    }
  } else if (instr instanceof WasmInstruction) {
    i = wasm.getInstruction(instr.startAddress);
  } else if (instr instanceof WASMFunction) {
    if (moment === 'before') {
      throw new Error(`unsupported`);
    }
    const endInstr = instr.body[instr.body.length - 1];
    instrs.push(endInstr);
  } else {
    wasm.instructionsFromOpcode(instr).forEach((i) => instrs.push(i));
  }
  if (i !== undefined) {
    instrs.push(i);
  }
  return instrs;
}

export function instruction<I extends WasmInstruction>(
  advices: AdvicesRegistery,
  moment: 'before',
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
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
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
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
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
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
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
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
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
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
  return advices.addInstructionsAdvice(hm, instrs, mutate, cb);
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
  i: WasmInstruction,
  stack: WASMValueIndexed[],
  moment: HookOnWasmAddrMoment,
): StackArgs {
  const signature = i.signature;
  switch (moment) {
    case HookOnWasmAddrMoment.HookBefore: {
      assertFatalHookError(
        stack.length >= signature.nrArgs,
        `VM failed to provide the stack needed to construct args. Expected stack size ${signature.nrArgs}. Given stack size ${stack.length}`,
      );
      return stack.slice(-i.signature.nrArgs).map((v: WASMValueIndexed) => {
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
        `Stack has not the expected number of values to read result for instr '${i.name}'`,
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
      const stackArgs = copyArgsFromStack(i, wasmState.stack ?? [], moment);
      let mutated = false;
      let argsCB: AdviceArgsCB;
      for (let adviceIdx = 0; adviceIdx < advices.length; adviceIdx++) {
        if (vm.isClosed()) break;

        const [advice, mutate] = advices[adviceIdx];
        mutated = mutate || mutated;
        argsCB = prepareArgsCB(stackArgs, argsCB, mutate);
        let newArgs;
        try {
          if (isNoArgAdvice(advice)) {
            await advice();
          } else if (isVMArgAdvice(advice)) {
            await advice(vm);
          } else {
            newArgs = await advice(i, argsCB as any, vm);
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
    return args.map((a) => new WritableWasmValue(a.type, a.value, a.idx));
  else return args.map((a) => new ReadOnlyWasmValue(a.type, a.value, a.idx));
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
    else return new ReadOnlyWasmValue(args.type, args.value, args.stackIdx);
  }

  if (args instanceof ReadOnlyWasmValue) {
    if (toWrite)
      return new WritableWasmValue(args.type, args.value, args.stackIdx);
    else return args;
  }

  if (args.length === 0) return [];

  if (args[0] instanceof WritableWasmValue) {
    if (toWrite) return args;
    const newArgs: ReadOnlyWasmValue[] = [];
    for (const arg of args)
      newArgs.push(new ReadOnlyWasmValue(arg.type, arg.value, arg.stackIdx));
    return newArgs;
  } else {
    if (!toWrite) return args;
    const newArgs: WritableWasmValue[] = [];

    for (const arg of args)
      newArgs.push(new WritableWasmValue(arg.type, arg.value, arg.stackIdx));
    return newArgs;
  }
}

async function updateArgsStack(
  args: WritableWasmValue[] | ReadOnlyWasmValue[],
  vm: WasmitoBackendVM,
): Promise<boolean> {
  for (const arg of args) {
    const s = await vm.updateStackValue(arg.stackIdx, arg);
    if (!s) return false;
  }
  return true;
}
