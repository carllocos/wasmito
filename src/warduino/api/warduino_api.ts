import { type Hook } from '../../hooks/hook';
import { type WasmState } from '../../state/wasm';
import { type StateRequest } from '../requests/inspect_request';

export interface WARDuinoAPI {
  connect: (timeout?: number) => Promise<boolean>;
  disconnect: (timeout?: number) => Promise<boolean>;
  close: () => Promise<boolean>;

  run: (timeout?: number) => Promise<boolean>;

  pause: (timeout?: number) => Promise<void>;

  step: (timeout?: number) => Promise<void>;

  addBreakpoint: (
    sourceCodeLocation: number,
    timeout?: number,
  ) => Promise<boolean>;

  removeBreakpoint: (
    sourceCodeLocation: number,
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

  // Hook API
  addHookBefore: <T>(
    sourceCodeLocation: number,
    hook: Hook<T>,
    timeout?: number,
  ) => Promise<boolean>;

  addHookAfter: <T>(
    sourceCodeLocation: number,
    hook: Hook<T>,
    timeout?: number,
  ) => Promise<boolean>;
}
