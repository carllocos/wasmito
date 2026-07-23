import assert from 'assert';
import { WasmitoBackendVM } from '../../runtimes/wasmito_vm/wasmito_vm';
import {
  WasmAddress,
  WasmInstruction,
} from '../../webassembly/wasm/wasm_instruction';
import { WasmModule } from '../../webassembly/wasm/wasm_module';
import { WasmCode, WasmOpcode } from '../../webassembly/wasm/wasm_opcode';
import { ReadOnlyWasmValue, WritableWasmValue } from '../interrupts';
import { GroupHooks, InstrMoment } from '../group_hooks';
import { WASM, WasmState } from '../../webassembly/wasm';
import { assertFatalHookError, Hook } from '../../hooks/hook';
import { InspectStateHook } from '../../hooks/hook_inspect_state';
import { StateRequest } from '../../runtimes/wasmito_vm/requests/inspect_request';
import { PauseVMHook } from '../../hooks/hook_run_pause';
import { getGlobalLogger } from '../../logger/logger';
import { WASMFunction } from '../../webassembly/wasm/wasm_function';

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
  moment: 'before',
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
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
): GroupHooks | undefined;
export function instruction<I extends WasmInstruction>(
  moment: 'before',
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
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
): GroupHooks | undefined;
export function instruction<I extends WasmInstruction>(
  moment: 'after',
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
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
): GroupHooks | undefined;
export function instruction<I extends WasmInstruction>(
  moment: 'after',
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
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
): GroupHooks | undefined;
export function instruction<I extends WasmInstruction>(
  moment: InstrMoment,
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode | WASMFunction,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
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
): GroupHooks | undefined {
  const instrs = getInstructions(wasm, instr, moment);
  if (instrs.length === 0) {
    return undefined;
  }

  const g = new GroupHooks(moment);
  for (const i of instrs) {
    const [actions, actionToSubscribe] = createActions(
      moment,
      i,
      mutate,
      cb.length,
    );
    const newCB = createCallback(
      vm,
      maxTimeoutMs,
      moment,
      wasm,
      i as I,
      mutate,
      cb,
    );
    actionToSubscribe.subscribe(newCB);
    g.addInstructionActions(i, actions);
  }
  return g;
}

function createCallback<I extends WasmInstruction>(
  vm: WasmitoBackendVM,
  maxTimeout: number,
  moment: InstrMoment,
  mod: WasmModule,
  instr: I,
  updateState: boolean,
  cb: (...args: any[]) => any,
): (s: WasmState) => Promise<void> {
  switch (cb.length) {
    case 0:
    case 1:
      return createCallbackNoArgs(vm, instr, moment, cb);
    case 2:
    case 3:
      if (moment === 'before') {
        return createCallbackWithArgs(
          vm,
          maxTimeout,
          mod,
          instr,
          updateState,
          cb,
        );
      } else if (moment === 'after') {
        return createCallbackWithResult(vm, maxTimeout, instr, updateState, cb);
      } else {
        throw new Error(`TODO callback for ${moment}`);
      }
    default:
      throw new Error(
        `Callback has not the right type signature. Given nr of arguments ${cb.length}`,
      );
  }
}

const actionsCache: Map<string, [Hook[], InspectStateHook]> = new Map();
function makeActionsCacheKey(
  cbArgs: number,
  i: WasmInstruction,
  mutate: boolean,
  moment: InstrMoment,
) {
  if (cbArgs <= 1) return mutate ? '1' : '0';

  const mutateSign = mutate ? '-1' : '2';
  if (moment === 'before') {
    return `${mutateSign} ${i.signature.nrArgs}`;
  } else if (moment === 'after') {
    return `${mutateSign} ${i.signature.nrResults}`;
  } else {
    return `${mutateSign} ${i.signature.nrArgs} ${i.signature.nrResults}`;
  }
}

function createActions(
  moment: InstrMoment,
  instr: WasmInstruction,
  updateState: boolean,
  cbNrOfArgs: number,
): [Hook[], InspectStateHook] {
  const key = makeActionsCacheKey(cbNrOfArgs, instr, updateState, moment);

  if (actionsCache.has(key)) return actionsCache.get(key)!;

  const inspectAction = new InspectStateHook(new StateRequest());
  inspectAction.includePC();
  switch (cbNrOfArgs) {
    case 0:
    case 1:
      break;
    case 2:
    case 3:
      if (moment === 'before') {
        if (instr.signature.nrArgs > 0) {
          inspectAction.includeStack();
        }
      } else if (moment === 'after') {
        if (instr.signature.nrResults > 0) {
          inspectAction.includeStack();
        }
      } else {
        throw new Error(`TODO callback for ${moment}`);
      }
      break;
    default:
      throw new Error(
        `Callback has not the right type signature. Given nr of arguments ${cbNrOfArgs}`,
      );
  }

  const hooks: Hook[] = [];
  if (updateState) hooks.push(new PauseVMHook());
  hooks.push(inspectAction);

  const actions: [Hook[], InspectStateHook] = [hooks, inspectAction];
  actionsCache.set(key, actions);
  return actions;
}

export function createCallbackNoArgs(
  vm: WasmitoBackendVM,
  instr: WasmInstruction,
  moment: InstrMoment,
  cb: // do not care about args, nor return value
  | ((vm: WasmitoBackendVM) => void)
    | ((vm: WasmitoBackendVM) => Promise<void>)
    | (() => void)
    | (() => Promise<void>),
): (s: WasmState) => Promise<void> {
  return async (s: WasmState) => {
    if (moment === 'before' && s.pc !== instr.startAddress) {
      return;
    }
    await cb(vm);
  };
}

function createCallbackWithArgs(
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  mod: WasmModule,
  instr: WasmInstruction,
  mutable: boolean,
  cb: (...args: any[]) => any, // cb: // update args
): (s: WasmState) => Promise<void> {
  return async (s: WasmState) => {
    assertFatalHookError(s.pc !== undefined, 'pc is empty');
    const i = mod.getInstruction(s.pc);
    assertFatalHookError(
      i !== undefined,
      `No instruction found for address ${s.pc}`,
    );

    if (i.startAddress !== instr.startAddress) return; // TODO replace with assert?

    assertFatalHookError(
      i.signature.nrArgs === instr.signature.nrArgs,
      `mismatch between expect args of instr ${i.name} and ${instr.name}`,
    );

    let args: WritableWasmValue[] | ReadOnlyWasmValue[] = [];
    if (i.signature.nrArgs > 0) {
      assertFatalHookError(
        s.stack !== undefined,
        'VM failed to provide the stack needed to construct args',
      );
      assertFatalHookError(
        s.stack.length >= i.signature.nrArgs,
        `Stack is expected to have #${i.signature.nrArgs} values but has ${s.stack.length} to reconstruct args for '${i.name}' inst at addr ${i.startAddress}`,
      );

      const vals = s.stack.slice(-i.signature.nrArgs);
      if (mutable) {
        args = vals.map((v) => new WritableWasmValue(v, v.idx));
      } else {
        args = vals.map((v) => new ReadOnlyWasmValue(v));
      }
    }

    const newArgs = await cb(i, args, vm);
    if (mutable) {
      assertFatalHookError(
        newArgs !== undefined,
        'No new values provided by the user registered callback',
      );
      // TODO check if returnValues has right type
      assertFatalHookError(
        newArgs instanceof Array,
        'new Args are expected to be an array',
      );
      logger.debug(
        `new Values: [${newArgs.map((v) => `(${WASM.typeToString(v.type)}, ${v.value})`).join(', ')}]`,
      );
      const success = await updateArgsStack(newArgs, vm);
      assert(success, 'failed to update the stack with new values');
      logger.debug('Resume execution on VM');
      await vm.run(maxTimeoutMs);
    } else {
      assertFatalHookError(
        newArgs === undefined,
        `Registered callback should not return any value as no update is expected`,
      );
    }
  };
}

async function updateArgsStack(
  args: WritableWasmValue[],
  vm: WasmitoBackendVM,
): Promise<boolean> {
  for (const arg of args) {
    const s = await vm.updateStackValue(arg.stackIdx, arg);
    if (!s) return false;
  }
  return true;
}

function createCallbackWithResult(
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  instr: WasmInstruction,
  mutate: boolean,
  cb: (...args: any[]) => any,
): (s: WasmState) => Promise<void> {
  return async (s: WasmState) => {
    // Careful!
    // since the pc in the retrieved Wasm state refers to the instruction that will be executed
    // after `instr`.
    // We pass to the user callback `instr` as argument
    assertFatalHookError(s.pc !== undefined, 'pc is empty');
    let result: WritableWasmValue | ReadOnlyWasmValue | undefined;

    if (instr.signature.nrResults > 0) {
      assertFatalHookError(
        s.stack !== undefined,
        `VM failed to provide the stack needed to construct args for instr '${instr.name}'`,
      );
      assertFatalHookError(
        s.stack.length >= instr.signature.nrResults,
        `Stack has not the expected number of values to read result for instr '${instr.name}'`,
      );

      const val = s.stack[s.stack.length - 1];
      result = mutate
        ? new WritableWasmValue(val, val.idx)
        : new ReadOnlyWasmValue(val);
    }

    const updatedValue = await cb(instr, result, vm);
    if (mutate) {
      assertFatalHookError(
        (updatedValue === undefined && result === undefined) ||
          updatedValue instanceof WritableWasmValue,
        'The returned user result is not a WritableWasmValue',
      );
      // TODO validate the new value
      if (updatedValue !== undefined) {
        logger.debug(`New value computed ${result?.value}`);
        const success = await updateArgsStack([updatedValue], vm);
        assert(
          success,
          `failed to update the stack with new value ${updatedValue.value} (type ${updatedValue.type})`,
        );
        logger.debug('Resume execution on VM');
        await vm.run(maxTimeoutMs);
      } else {
        await vm.run(maxTimeoutMs);
      }
    } else {
      assertFatalHookError(
        updatedValue === undefined,
        `Registered callback should not return any value as no update is expected`,
      );
    }
  };
}
