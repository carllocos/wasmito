import { type Hook } from '../../hooks/hook';
import { type SourceCodeLocation } from '../../source_mappers';
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

  // Hook API
  addHookBefore: <T>(
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook<T>,
    timeout?: number,
  ) => Promise<boolean>;

  addHookAfter: <T>(
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook<T>,
    timeout?: number,
  ) => Promise<boolean>;
}
