import assert from 'assert';
import { WasmitoBackendVM } from '../runtimes/wasmito_vm/wasmito_vm';
import {
  ReadOnlyInterrupt,
  ReadOnlyWasmValue,
  WritableInterrupt,
  WritableWasmValue,
} from './interrupts';
import { GroupHooks } from './group_hooks';
import { createLogger, Logger } from '../logger/logger';
import { createCallbackNoArgs, instruction } from './util/analyse_instruction';
import { interrupt } from './util/analyse_interrupts';
import { LanguageAdaptor } from '../language_adaptors';
import {
  SourceCFGNode,
  sourceNodeFirstInstruction,
} from '../cfg/source_cfg_node_edge';
import { StateRequest } from '../runtimes/wasmito_vm/requests/inspect_request';
import { WasmModule } from '../webassembly/wasm/wasm_module';
import {
  CallInstruction,
  WasmAddress,
  WasmInstruction,
} from '../webassembly/wasm/wasm_instruction';
import { WasmCode, WasmOpcode } from '../webassembly/wasm/wasm_opcode';
import { WasmState } from '../webassembly/wasm';
import { assertFatalHookError, Hook } from '../hooks/hook';
import { InspectStateHook } from '../hooks/hook_inspect_state';
import { SourceMap } from '../source_mappers/source_map';
import { HookOnWasmAddrRequest } from '../runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import { WASMFunction } from '../webassembly/wasm/wasm_function';
import { isErrorMessage } from '../runtimes/request_msg';

export interface AnalysisConfig {
  name: string;
  maxTimeoutMs: number;
}

export class WasmAnalysis {
  public readonly wasm: WasmModule;
  private vm: WasmitoBackendVM;
  private groups: GroupHooks[];
  private interruptGroups: GroupHooks[];
  private _logger: Logger;
  private maxTimeoutMs: number;
  private _sourceMap?: SourceMap;
  private _adaptor?: LanguageAdaptor;
  private envFuncForPinInterrupt: number;
  private analysisResolver: any;
  private userOnFinishCB: any;

  constructor(
    wasm: WasmModule | SourceMap | LanguageAdaptor,
    vm: WasmitoBackendVM,
    config?: AnalysisConfig,
  ) {
    if (wasm instanceof WasmModule) {
      this.wasm = wasm;
    } else if (wasm instanceof SourceMap) {
      this.wasm = wasm.wasm;
      this._sourceMap = wasm;
    } else {
      this._adaptor = wasm;
      this.wasm = wasm.sourceMap.wasm;
      this._sourceMap = wasm.sourceMap;
    }
    this.vm = vm;
    this.groups = [];
    this.interruptGroups = [];
    this._logger = createLogger(config?.name ?? 'WasmAnalyse');
    this.maxTimeoutMs = config?.maxTimeoutMs ?? 30000;
    this.envFuncForPinInterrupt = this.findEnvFuncForPinInterrupt();
  }

  private addGroup(g: GroupHooks | undefined): GroupHooks | undefined {
    if (g !== undefined) {
      assert(g.actions.length > 0, 'No action registered for group');
      if (g.instructions.length >= 1) this.groups.push(g);
      else this.interruptGroups.push(g);
    }
    return g;
  }

  private findEnvFuncForPinInterrupt(): number {
    for (const func of this.wasm.importFuncs) {
      if (func.fullName.includes('subscribe_interrupt')) return func.id;
    }
    this._logger.debug(`No subscribe env function found in the given module`);
    return -1;
  }

  /*
   * Register a callback to be executed `before` the given `instr` is executed on the VM.
   *
   */
  before<I extends WasmInstruction>(
    instr:
      | I
      | WasmAddress
      | WasmOpcode
      | WasmCode.MultipleOpcode
      | WASMFunction,
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
  ): GroupHooks | undefined {
    const mutate = false;
    return this.addGroup(
      instruction<I>(
        'before',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
  }

  beforeMut<I extends WasmInstruction>(
    instr:
      | I
      | WasmAddress
      | WasmOpcode
      | WasmCode.MultipleOpcode
      | WASMFunction,
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
  ): GroupHooks | undefined {
    const mutate = true;
    return this.addGroup(
      instruction<I>(
        'before',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
  }

  after<I extends WasmInstruction>(
    instr:
      | I
      | WasmAddress
      | WasmOpcode
      | WasmCode.MultipleOpcode
      | WASMFunction,
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
  ): GroupHooks | undefined {
    const mutate = false;
    return this.addGroup(
      instruction<I>(
        'after',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
  }

  afterMut<I extends WasmInstruction>(
    instr:
      | I
      | WasmAddress
      | WasmOpcode
      | WasmCode.MultipleOpcode
      | WASMFunction,
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
  ): GroupHooks | undefined {
    const mutate = true;
    return this.addGroup(
      instruction<I>(
        'after',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
  }

  onNewInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | ((ev: ReadOnlyInterrupt) => void)
      | (() => void),
  ): GroupHooks {
    const mutate = false;
    const gh = this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'onNewInterrupt',
        mutate,
        mutate,
        cb,
      ),
    );
    assert(gh !== undefined, 'failed to hook upon `onNewInterrupt`');
    return gh;
  }

  onNewInterruptMut(
    cb:
      | ((ev: WritableInterrupt, vm: WasmitoBackendVM) => WritableInterrupt)
      | ((ev: WritableInterrupt) => WritableInterrupt)
      | (() => void),
  ): GroupHooks {
    const mutate = true;
    const gh = this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'onNewInterrupt',
        mutate,
        mutate,
        cb,
      ),
    );
    assert(gh !== undefined, 'failed to hook upon `onNewInterruptMut`');
    return gh;
  }

  beforeHandlingInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | ((ev: ReadOnlyInterrupt) => void)
      | (() => void),
  ): GroupHooks {
    const mutate = false;
    const gh = this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'beforeInterruptHandled',
        mutate,
        mutate,
        cb,
      ),
    );
    assert(gh !== undefined, 'failed to hook upon `beforeInterruptHandled`');
    return gh;
  }

  beforeHandlingInterruptMut(
    cb:
      | ((ev: WritableInterrupt, vm: WasmitoBackendVM) => WritableInterrupt)
      | ((ev: WritableInterrupt) => WritableInterrupt)
      | (() => void),
  ): GroupHooks {
    const mutate = true;
    const gh = this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'beforeInterruptHandled',
        mutate,
        mutate,
        cb,
      ),
    );
    assert(gh !== undefined, 'failed to hook upon `beforeInterruptHandledMut`');
    return gh;
  }

  afterHandlingInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt) => void)
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | (() => void),
  ): GroupHooks {
    const mutate = false;
    const gh = this.addGroup(
      interrupt(
        this.vm,
        this.maxTimeoutMs,
        'afterHandlingInterrupt',
        mutate,
        mutate,
        cb,
      ),
    );
    assert(gh !== undefined, 'failed to hook upon `afterHandlingInterrupt`');
    return gh;
  }

  onPinInterruptHandlerUpdateMut(
    cb:
      | ((handlers: PinInterruptHandler[], vm: WasmitoBackendVM) => void)
      | ((
          handlers: PinInterruptHandler[],
          vm: WasmitoBackendVM,
        ) => Promise<void>),
  ): boolean {
    const calls = this.wasm.getCallInstructions(this.envFuncForPinInterrupt);
    for (const call of calls)
      this.afterMut(call, this.askInterruptHandlers(cb));
    return calls.length > 0;
  }

  private askInterruptHandlers(
    cb:
      | ((handlers: PinInterruptHandler[], vm: WasmitoBackendVM) => void)
      | ((
          handlers: PinInterruptHandler[],
          vm: WasmitoBackendVM,
        ) => Promise<void>),
  ) {
    return async (
      _c: CallInstruction,
      _r: WritableWasmValue | undefined,
      vm: WasmitoBackendVM,
    ): Promise<WritableWasmValue | undefined> => {
      const state = new StateRequest();
      state.includeCallbackMappings();
      state.includeTable();
      const s = await vm.inspect(state);
      const tbl = s.table;
      assert(tbl !== undefined);
      const handlers = s.callbackMappings.map((cbm) => {
        return callbackMappingToPinInterruptHandler(this.wasm, tbl, cbm);
      });
      await cb(handlers, vm);
      return _r;
    };
  }

  onNodeEntry(
    node: SourceCFGNode,
    cb: (
      n: SourceCFGNode,
      instr: WasmInstruction,
      args: ReadOnlyWasmValue[],
      vm: WasmitoBackendVM,
    ) => void,
  ): GroupHooks;
  onNodeEntry(
    node: SourceCFGNode,
    cb: (
      n: SourceCFGNode,
      instr: WasmInstruction,
      args: ReadOnlyWasmValue[],
    ) => void,
  ): GroupHooks;
  onNodeEntry(
    node: SourceCFGNode,
    cb: (n: SourceCFGNode, instr: WasmInstruction) => void,
  ): GroupHooks;
  onNodeEntry(
    node: SourceCFGNode,
    cb: (vm: WasmitoBackendVM) => void,
  ): GroupHooks;
  onNodeEntry(node: SourceCFGNode, cb: () => void): GroupHooks;
  onNodeEntry(node: SourceCFGNode, cb: (...args: any[]) => any): GroupHooks {
    // TODO fix incomingEdges
    // const reachableInstrs = node.incomingEdges.map(SourceCFGEdgeToInstruction);
    const reachableInstrs = [sourceNodeFirstInstruction(node)];
    assert(reachableInstrs.length > 0);
    const moment = 'before';
    const g = new GroupHooks(moment);
    for (const i of reachableInstrs) {
      const [actions, actionToSubscribe] = createActionsNode(i, cb.length);
      const newCB = createCallbackNode(node, this.vm, this.wasm, i, moment, cb);
      actionToSubscribe.subscribe(newCB);
      g.addInstructionActions(i, actions);
    }
    const gh = this.addGroup(g);
    assert(gh !== undefined, 'failed to hook upon `onNodeEntry`');
    return gh;
  }

  onError(_cb: (...args: any[]) => any): GroupHooks {
    throw new Error(`TODO`);

    // async function closeOnError(
    //   wasm: WasmModule,
    //   vmConnection: WasmitoBackendVM,
    // ): Promise<void> {
    //   const inspectAction = new InspectStateHook().includePC().includeException();
    //   inspectAction.subscribe((wasmState) => {
    //     assert(wasmState.pc !== undefined);
    //     const instr = wasm.getInstruction(wasmState.pc);
    //     assert(instr !== undefined);
    //     console.log(
    //       `Exception occurred at 0x${instr.startAddress} ${instr.name}: ${wasmState.exception}\n`,
    //     );
    //   });
    //   await hookOnError([inspectAction], vmConnection);
    // }
  }

  aroundFunction(_cb: (...args: any[]) => any): GroupHooks {
    // async function aroundDigitalWrite(
    //   wasm: WasmModule,
    //   vmConnection: WasmitoBackendVM,
    // ): Promise<void> {
    //   // BUG
    //   // (;@48    ;)  (import "env" "chip_digital_write" (func $src/arduino/chip_digital_write (;1;) (type $#type0)))
    //   const digitalWrite = wasm.getFunction(1);
    //   assert(digitalWrite !== undefined);
    //   await aroundFunction(digitalWrite, vmConnection);
    // }
    throw new Error('TODO');
  }

  private assertValidGroups(): [GroupHooks[], GroupHooks[]] {
    const gps = this.groups.filter((g) => !g.deployed);
    assert(
      gps.length > 0 || this.interruptGroups.length > 0,
      `No hooks registed to deploy`,
    );
    return [gps, this.interruptGroups];
  }

  }

  async remove(): Promise<void> {}

  private async deployOnInterrupts(
    g: GroupHooks,
    timeoutMs?: number,
  ): Promise<void> {
    let cb;
    switch (g.mode) {
      case 'onNewInterrupt':
        cb = this.vm.addHookOnNewEvent.bind(this.vm);
        break;
      case 'beforeInterruptHandled':
        cb = this.vm.addHookOnEventHandling.bind(this.vm);
        break;
      // case 'afterHandlingInterrupt':
      default:
        throw new Error(`unsupported moment ${g.mode}`);
    }
    for (const a of g.actions) {
      const success = await cb(a, timeoutMs);
      if (!success) {
        throw new Error(
          `failed to add action '${a.description()}' onNewInterrupt`,
        );
      }
    }
  }

  private async deployOnInstructions(
    g: GroupHooks,
    timeoutMs?: number,
  ): Promise<void> {
    for (const i of g.instructions) {
      for (const a of g.getInstructionActions(i)) {
        const added = await this.vm.addHookOnAddr(
          i.startAddress,
          a,
          g.internalInstructionMode,
          timeoutMs,
        );
        if (!added) {
          throw new Error(
            `failed to register action '${a.description}' on instr '${i.name}' at address '${i.startAddress}'}`,
          );
        }
      }
    }
    g.deployed = true;
  }

  async run<T>(
    onComplete:
      | (() => Promise<T>)
      | (() => T)
      | ((vm: WasmitoBackendVM) => Promise<T>)
      | ((vm: WasmitoBackendVM) => T),
  ): Promise<T>;
  async run<T>(
    onComplete:
      | (() => Promise<T>)
      | (() => T)
      | ((vm: WasmitoBackendVM) => Promise<T>)
      | ((vm: WasmitoBackendVM) => T),
    timeoutMs: number,
  ): Promise<T>;
  async run(timeoutMs: number): Promise<void>;
  async run(): Promise<void>;
  async run(...args: any[]): Promise<void> {
    let timeoutMs: number | undefined;
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      switch (args.length) {
        case 0:
          break;
        case 1:
          if (typeof args[0] === 'number') {
            timeoutMs = args[0];
          } else if (typeof args[0] === 'function') {
            this.userOnFinishCB = args[0];
          } else {
            throw new Error(`invalid arguments`);
          }
          break;
        default:
          if (typeof args[0] !== 'function' || typeof args[1] !== 'number') {
            throw new Error(`invalid arguments`);
          }
          this.userOnFinishCB = args[0];
          timeoutMs = args[1];
          break;
      }
      this.analysisResolver = resolve;

      await this.vm.run(timeoutMs);
    });
  }
  }
}

function createActionsNode(
  instr: WasmInstruction,
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
    case 2:
      break;
    case 3:
    case 4:
      if (instr.signature.nrArgs > 0) {
        inspectAction.includeStack();
      }
      break;
    default:
      throw new Error(
        `Callback has not the right type signature. Given nr of arguments ${cbNrOfArgs}. Expected at most 5`,
      );
  }
  hooks.push(inspectAction);
  return [hooks, inspectAction];
}

function createCallbackNode(
  node: SourceCFGNode,
  vm: WasmitoBackendVM,
  mod: WasmModule,
  instr: WasmInstruction,
  moment: InstrMoment,
  cb: (...args: any[]) => any,
): (s: WasmState) => void {
  switch (cb.length) {
    case 0:
    case 1:
      return createCallbackNoArgs(vm, instr, moment, cb);
    case 2:
      return callbackArgs(node, mod, instr, false, vm, cb);
    case 3:
    case 4:
      return callbackArgs(node, mod, instr, true, vm, cb);
    default:
      throw new Error(`Callback has incorrect number of arguments`);
  }
}

function callbackArgs(
  node: SourceCFGNode,
  mod: WasmModule,
  instr: WasmInstruction,
  includeInstrArgs: boolean,
  vm: WasmitoBackendVM,
  cb: (...args: any[]) => any,
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
    if (includeInstrArgs && i.signature.nrArgs > 0) {
      assertFatalHookError(
        s.stack !== undefined,
        'VM failed to provide the stack needed to construct args',
      );
      assertFatalHookError(
        s.stack.length >= i.signature.nrArgs,
        `Stack is expected to have #${i.signature.nrArgs} values but has ${s.stack.length} to reconstruct args for '${i.name}' inst at addr ${i.startAddress}`,
      );

      const vals = s.stack.slice(-i.signature.nrArgs);
      args = vals.map((v) => new ReadOnlyWasmValue(v));
    }

    const newArgs = cb(node, i, args, vm);
    assertFatalHookError(
      newArgs === undefined,
      `Registered callback should not return any value as no update is expected`,
    );
  };
}
