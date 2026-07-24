import assert from 'assert';
import { WasmitoBackendVM } from '../runtimes/wasmito_vm/wasmito_vm';
import {
  callbackMappingToPinInterruptHandler,
  PinInterruptHandler,
  ReadOnlyInterrupt,
  ReadOnlyWasmValue,
  WritableInterrupt,
  WritableWasmValue,
} from './interrupts';
import { GroupHooks, InstrMoment } from './group_hooks';
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
import { WASMFunction } from '../webassembly/wasm/wasm_function';
import { isErrorMessage } from '../runtimes/request_msg';
import { APIRequest, HookOnWasmAddrRequest } from '../runtimes';

export interface AnalysisConfig {
  name: string;
  maxTimeoutMs: number;
}

export class WasmAnalysis {
  public readonly wasm: WasmModule;
  private vm: WasmitoBackendVM;
  private interruptGroups: GroupHooks[];
  private _logger: Logger;
  private maxTimeoutMs: number;
  private _sourceMap?: SourceMap;
  private _adaptor?: LanguageAdaptor;
  private envFuncForPinInterrupt: number;
  private analysisResolver: any;
  private userOnFinishCB: any;
  private _requests: HookOnWasmAddrRequest[];

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
    this.interruptGroups = [];
    this._requests = [];
    this._logger = createLogger(config?.name ?? 'WasmAnalyse');
    this.maxTimeoutMs = config?.maxTimeoutMs ?? 30000;
    this.envFuncForPinInterrupt = this.findEnvFuncForPinInterrupt();
  }

  private addGroupInterrupt(
    group: GroupHooks | undefined,
    typeHook: string,
  ): void {
    assert(group !== undefined, `failed to hook upon '${typeHook}'`);
  }

  private addGroup(reqs: number): void {
    assert(reqs > 0, 'No action registered for group');
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
  ): this {
    const mutate = false;
    this.addGroup(
      instruction<I>(
        this._requests,
        'before',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
    return this;
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
  ): this {
    const mutate = true;
    this.addGroup(
      instruction<I>(
        this._requests,
        'before',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
    return this;
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
  ): this {
    const mutate = false;
    this.addGroup(
      instruction<I>(
        this._requests,
        'after',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
    return this;
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
  ): this {
    const mutate = true;
    this.addGroup(
      instruction<I>(
        this._requests,
        'after',
        instr,
        this.wasm,
        this.vm,
        this.maxTimeoutMs,
        cb,
        mutate,
      ),
    );
    return this;
  }

  async close() {
    await this.vm.close();
  }

  onNewInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | ((ev: ReadOnlyInterrupt) => void)
      | (() => void),
  ): this {
    const mutate = false;
    const groupType = 'onNewInterrupt';
    this.addGroupInterrupt(
      interrupt(this.vm, this.maxTimeoutMs, groupType, mutate, mutate, cb),
      groupType,
    );
    return this;
  }

  onNewInterruptMut(
    cb:
      | ((ev: WritableInterrupt, vm: WasmitoBackendVM) => WritableInterrupt)
      | ((ev: WritableInterrupt) => WritableInterrupt)
      | (() => void),
  ): this {
    const mutate = true;
    const groupType = 'onNewInterrupt';
    this.addGroupInterrupt(
      interrupt(this.vm, this.maxTimeoutMs, groupType, mutate, mutate, cb),
      groupType,
    );
    return this;
  }

  beforeHandlingInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | ((ev: ReadOnlyInterrupt) => void)
      | (() => void),
  ): this {
    const mutate = false;
    const groupType = 'beforeInterruptHandled';
    this.addGroupInterrupt(
      interrupt(this.vm, this.maxTimeoutMs, groupType, mutate, mutate, cb),
      groupType,
    );
    return this;
  }

  beforeHandlingInterruptMut(
    cb:
      | ((ev: WritableInterrupt, vm: WasmitoBackendVM) => WritableInterrupt)
      | ((ev: WritableInterrupt) => WritableInterrupt)
      | (() => void),
  ): this {
    const mutate = true;
    const groupType = 'beforeInterruptHandled';
    this.addGroupInterrupt(
      interrupt(this.vm, this.maxTimeoutMs, groupType, mutate, mutate, cb),
      groupType,
    );
    return this;
  }

  afterHandlingInterrupt(
    cb:
      | ((ev: ReadOnlyInterrupt) => void)
      | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
      | (() => void),
  ): this {
    const mutate = false;
    const groupType = 'afterHandlingInterrupt';
    this.addGroupInterrupt(
      interrupt(this.vm, this.maxTimeoutMs, groupType, mutate, mutate, cb),
      groupType,
    );
    return this;
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
    throw new Error('TODO');
    // const gh = this.addGroup(g);
    // assert(gh !== undefined, 'failed to hook upon `onNodeEntry`');
    // return gh;
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

  async deploy(): Promise<void>;
  async deploy(timeoutMs: number): Promise<void>;
  async deploy(deployInBulk: boolean): Promise<void>;
  async deploy(deployInBulk: boolean, timeoutMs: number): Promise<void>;
  async deploy(...args: any[]): Promise<void> {
    this.onFinish(); // TODO find a way to put as last

    let deployInBulk: boolean = true;
    let timeoutMs: number | undefined = undefined;
    switch (args.length) {
      case 2:
        deployInBulk = args[0];
        timeoutMs = args[1];
        break;
      case 1:
        if (typeof args[0] === 'boolean') {
          deployInBulk = args[0];
        } else if (typeof args[0] === 'number') {
          timeoutMs = args[0];
        }
        break;
    }
    await this.deployOnInstructions(this._requests, deployInBulk, timeoutMs);
    // await this.deployInterruptGroups(interruptGroups, timeoutMs);
  }

  private async deployInterruptGroups(
    gps: GroupHooks[],
    timeoutMs?: number,
  ): Promise<void> {
    // TODO bulk
    for (let idx = 0; idx < gps.length; idx++) {
      this._logger.debug(
        `Deploying Interrupt Group #${idx + 1} out of #${gps.length}`,
      );
      await this.deployOnInterrupts(gps[idx], timeoutMs);
    }
    return;
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
    reqs: APIRequest<any>[],
    inBulk: boolean,
    timeoutPerRequestMs?: number,
  ): Promise<void> {
    await this.vm.sendRequests(reqs, inBulk, timeoutPerRequestMs);
    for (const req of reqs) {
      const response = req.responseMessage;
      if (isErrorMessage(response)) {
        const msg = `Failed to register hook '${req.description()}'. Reason: ${response.error_msg} (error code ${response.error_code}))`;
        this._logger.error(msg);
        throw new Error(msg);
      }
    }
    return;
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

  private onFinish(): void {
    const mainFunc = this.wasm.getMainFunction();
    this.after(mainFunc, async (vm: WasmitoBackendVM) => {
      let v = undefined;
      if (this.userOnFinishCB !== undefined) v = await this.userOnFinishCB(vm);
      await vm.close();
      this.analysisResolver(v);
    });
  }
}

function createActionsNode(
  instr: WasmInstruction,
  cbNrOfArgs: number,
): [Hook[], InspectStateHook] {
  const hooks: Hook[] = [];
  const inspectAction = new InspectStateHook(new StateRequest());
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
