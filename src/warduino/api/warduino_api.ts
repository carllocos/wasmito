import { type WasmState } from '../../state/wasm';
import { type StateRequest } from '../requests/inspect_request';

export interface WARDuinoAPI {
  connect: (timeout?: number) => Promise<boolean>;
  disconnect: (timeout?: number) => Promise<boolean>;
  close: () => Promise<boolean>;
  run: (timeout?: number) => Promise<boolean>;
  pause: (timeout?: number) => Promise<void>;
  step: (timeout?: number) => Promise<void>;
  proxify: (timeout?: number) => Promise<void>;
  uploadSourceCode: (
    sourceCodePath: string,
    timeout?: number,
  ) => Promise<boolean>;
  inspect: (neededState: StateRequest, timeout?: number) => Promise<WasmState>;
  snapshot: (timeout?: number) => Promise<WasmState>;
  loadWasmState: (state: WasmState, timeout?: number) => Promise<void>;
}
