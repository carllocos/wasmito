import { type Hook } from '../../hooks/hook';
import {
  type WASMFunction,
  type SourceCodeLocation,
} from '../../source_mappers';
import { type WASM, type WasmState } from '../../state/wasm';
import { type StateRequest } from '../requests/inspect_request';
import { type ProxyCallResponse } from '../requests/fun_call_request';

export interface WARDuinoAPI {
  run: (timeout?: number) => Promise<boolean>;

  pause: (timeout?: number) => Promise<void>;

  step: (timeout?: number) => Promise<void>;

  addBreakpoint: (
    sourceCodeLocation: SourceCodeLocation,
    stateOnBreakpoint?: StateRequest,
    stateHandler?: (state: WasmState) => void,
    timeout?: number,
  ) => Promise<boolean>;

  removeBreakpoint: (
    sourceCodeLocation: SourceCodeLocation,
    timeout?: number,
  ) => Promise<boolean>;

  proxify: (timeout?: number) => Promise<void>;

  uploadSourceCode: (
    sourceCodePath: string,
    timeout?: number,
  ) => Promise<boolean>;

  inspect: (neededState: StateRequest, timeout?: number) => Promise<WasmState>;

  snapshot: (timeout?: number) => Promise<WasmState>;

  loadWasmState: (state: WasmState, timeout?: number) => Promise<void>;

  resolveEvent: (timeout?: number) => Promise<void>;

  registerFuncForProxyCall: (
    funcToProxy: WASMFunction,
    timeout?: number,
  ) => Promise<boolean>;

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

  addHookOnNewEvent: (hook: Hook, timeout?: number) => Promise<boolean>;

  addHookOnEventHandling: (hook: Hook, timeout?: number) => Promise<boolean>;
}
