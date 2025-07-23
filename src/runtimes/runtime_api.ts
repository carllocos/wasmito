import { type Hook } from '../hooks/hook';
import { type SourceCodeLocation } from '../source_mappers';
import { type WASM, type WasmState } from '../webassembly/wasm';
import { type StateRequest } from './vm/requests/inspect_request';
import { type ProxyCallResponse } from './vm/requests/fun_call_request';
import { type BreakpointPolicy } from '../debugger/breakpoint_policies';
import { type Breakpoint } from '../debugger/breakpoint';
import { type WASMFunction } from '../webassembly/wasm/wasm_function';
import { type SourceCFGNode } from '../cfg';

export interface WasmRuntimeAPI {
  run: (timeout?: number) => Promise<boolean>;

  pause: (timeout?: number) => Promise<void>;

  step: (timeout?: number) => Promise<void>;

  breakpointPolicy: () => BreakpointPolicy;

  changeBreakpointPolicy: (p: BreakpointPolicy) => void;

  addBreakpoint: (breakpoint: Breakpoint, timeout?: number) => Promise<boolean>;

  removeBreakpoint: (
    breakpoint: Breakpoint,
    timeout?: number,
  ) => Promise<boolean>;

  proxify: (timeout?: number) => Promise<void>;

  uploadSourceCode: (
    sourceCodeCompilationArgs: any,
    timeout?: number,
  ) => Promise<boolean>;

  inspect: (neededState: StateRequest, timeout?: number) => Promise<WasmState>;

  snapshot: (timeout?: number) => Promise<WasmState>;

  loadWasmState: (state: WasmState, timeout?: number) => Promise<void>;

  resolveEvent: (timeout?: number) => Promise<void>;

  unregisterFuncForProxyCall: (
    funcToProxy: WASMFunction,
    timeout?: number,
  ) => Promise<boolean>;

  registerFuncForProxyCall: (
    funcToProxy: WASMFunction,
    timeout?: number,
  ) => Promise<boolean>;

  functionsProxied: () => Set<WASMFunction>;

  proxyCall: (
    funcid: number,
    args: WASM.Value[],
    timeout?: number,
  ) => Promise<ProxyCallResponse>;

  // Hook API
  addHookBefore: (
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    timeout?: number,
  ) => Promise<boolean>;

  addHookAfter: (
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    timeout?: number,
  ) => Promise<boolean>;

  addHookBeforeSrcNode: (
    node: SourceCFGNode,
    hook: Hook,
    timeout?: number,
  ) => Promise<boolean>;

  // TODO IO event
  addHookOnNewEvent: (hook: Hook, timeout?: number) => Promise<boolean>;

  addHookOnEventHandling: (hook: Hook, timeout?: number) => Promise<boolean>;

  addHookOnError: (hook: Hook, timeout?: number) => Promise<boolean>;

  subscribeOnNewEvent: (
    cb: (ev: WASM.Event) => void,
    timeout?: number,
  ) => Promise<boolean>;
}
