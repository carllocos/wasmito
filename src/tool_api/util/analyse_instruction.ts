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
import { WasmState } from '../../webassembly/wasm';
import { assertFatalHookError, Hook } from '../../hooks/hook';
import { InspectStateHook } from '../../hooks/hook_inspect_state';
import { StateRequest } from '../../runtimes/wasmito_vm/requests/inspect_request';
import { PauseVMHook } from '../../hooks/hook_run_pause';
import { getGlobalLogger } from '../../logger/logger';

export function getInstructions<I extends WasmInstruction>(
  wasm: WasmModule,
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode,
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
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  cb:
    | ((instr: I, args: ReadOnlyWasmValue[], vm: WasmitoBackendVM) => void)
    | ((instr: I, args: ReadOnlyWasmValue[]) => void)
    | ((vm: WasmitoBackendVM) => void)
    | (() => void),
  mutate: false,
): GroupHooks | undefined;
export function instruction<I extends WasmInstruction>(
  moment: 'before',
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  cb:
    | ((
        instr: I,
        args: WritableWasmValue[],
        vm: WasmitoBackendVM,
      ) => WritableWasmValue[])
    | ((instr: I, args: WritableWasmValue[]) => WritableWasmValue[]),
  mutate: true,
): GroupHooks | undefined;
export function instruction<I extends WasmInstruction>(
  moment: 'after',
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  cb:
    | ((
        instr: I,
        result: ReadOnlyWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => void)
    | ((instr: I, result: ReadOnlyWasmValue | undefined) => void)
    | ((vm: WasmitoBackendVM) => void)
    | (() => void),
  mutate: false,
): GroupHooks | undefined;
export function instruction<I extends WasmInstruction>(
  moment: 'after',
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode,
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
      ) => WritableWasmValue | undefined),
  mutate: true,
): GroupHooks | undefined;
export function instruction<I extends WasmInstruction>(
  moment: InstrMoment,
  instr: I | WasmAddress | WasmOpcode | WasmCode.MultipleOpcode,
  wasm: WasmModule,
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  // cb: (...args: any[]) => any,
  // updateState?: boolean,
  cb:
    | ((
        instr: I,
        args: WritableWasmValue[],
        vm: WasmitoBackendVM,
      ) => WritableWasmValue[])
    | ((instr: I, args: WritableWasmValue[]) => WritableWasmValue[])
    | ((instr: I, args: ReadOnlyWasmValue[], vm: WasmitoBackendVM) => void)
    | ((instr: I, args: ReadOnlyWasmValue[]) => void)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => WritableWasmValue | undefined)
    | ((
        instr: I,
        result: ReadOnlyWasmValue | undefined,
        vm: WasmitoBackendVM,
      ) => void)
    | ((instr: I, result: ReadOnlyWasmValue | undefined) => void)
    | ((
        instr: I,
        result: WritableWasmValue | undefined,
      ) => WritableWasmValue | undefined)
    | ((vm: WasmitoBackendVM) => void)
    | (() => void),
  mutate: boolean,
): GroupHooks | undefined {
  const instrs = getInstructions(wasm, instr);
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
): (s: WasmState) => void {
  switch (cb.length) {
    case 0:
    case 1:
      return createCallbackNoArgs(vm, cb);
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

function createActions(
  moment: InstrMoment,
  instr: WasmInstruction,
  updateState: boolean,
  cbNrOfArgs: number,
): [Hook[], InspectStateHook] {
  const hooks: Hook[] = [];
  const inspectAction = new InspectStateHook(
    new StateRequest(),
    instr.startAddress,
  );
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
  if (updateState) {
    hooks.push(new PauseVMHook());
  }
  hooks.push(inspectAction);
  return [hooks, inspectAction];
}

export function createCallbackNoArgs(
  vm: WasmitoBackendVM,
  cb: // do not care about args, nor return value
  ((vm: WasmitoBackendVM) => void) | (() => void),
): (s: WasmState) => void {
  return (_s: WasmState) => {
    cb(vm);
  };
}

function createCallbackWithArgs(
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  mod: WasmModule,
  instr: WasmInstruction,
  mutable: boolean,
  cb: (...args: any[]) => any, // cb: // update args
): (s: WasmState) => void {
  return (s: WasmState) => {
    assertFatalHookError(s.pc !== undefined, 'pc is empty');
    const i = mod.getInstruction(s.pc);
    assertFatalHookError(
      i !== undefined,
      `No instruction found for address ${s.pc}`,
    );

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

    const newArgs = cb(i, args, vm);
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
      getGlobalLogger().debug(
        `new Values: [${newArgs.map((v) => v.value).join(', ')}]`,
      );
      updateArgsStack(newArgs, vm).then((s) => {
        assert(s, 'failed to update the stack with new values');
        getGlobalLogger().debug('Resume execution on VM');
        vm.run(maxTimeoutMs); // TODO await
      });
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
): (s: WasmState) => void {
  return (s: WasmState) => {
    // Careful!
    // since the pc in the retrieved Wasm state refers to the instruction that will be executed
    // after `instr`.
    // We pass to the user callback `instr` as argument
    assertFatalHookError(s.pc !== undefined, 'pc is empty');
    let result: WritableWasmValue | ReadOnlyWasmValue | undefined;

    if (instr.signature.nrResults) {
      assertFatalHookError(
        s.stack !== undefined,
        'VM failed to provide the stack needed to construct args',
      );
      assertFatalHookError(
        s.stack.length >= instr.signature.nrResults,
        'Stack has not the expected number of values to read result',
      );

      const val = s.stack[s.stack.length - 1];
      result = mutate
        ? new WritableWasmValue(val, val.idx)
        : new ReadOnlyWasmValue(val);
    }

    const updatedValue = cb(instr, result, vm);
    if (mutate) {
      assertFatalHookError(
        (updatedValue === undefined && result === undefined) ||
          updatedValue instanceof WritableWasmValue,
        'The returned user result is not a WritableWasmValue',
      );
      // TODO validate the new value
      if (updatedValue !== undefined) {
        getGlobalLogger().debug(`New value computed ${result?.value}`);
        updateArgsStack([updatedValue], vm).then((s) => {
          assert(
            s,
            `failed to update the stack with new value ${updatedValue.value} (type ${updatedValue.type})`,
          );
          getGlobalLogger().debug('Resume execution on VM');
          vm.run(maxTimeoutMs); // TODO await
        });
      } else {
        vm.run(maxTimeoutMs); // TODO await
      }
    } else {
      assertFatalHookError(
        updatedValue === undefined,
        `Registered callback should not return any value as no update is expected`,
      );
    }
  };
}
