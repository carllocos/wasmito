import { type WasmState } from '../webassembly/wasm';
import { type StateRequest } from '../runtimes/wasmito_vm/requests/inspect_request';
import { HookKind, HookWithSubscription } from './hook';

export class InspectStateHook extends HookWithSubscription<WasmState> {
  private readonly _stateToInspect: StateRequest;
  public readonly wasmAddress?: number;
  constructor(stateRequest: StateRequest, wasmAddress?: number) {
    super(HookKind.StateToInspect);
    this._stateToInspect = stateRequest;
    this.wasmAddress = wasmAddress;
    if (this.wasmAddress !== undefined) {
      this._stateToInspect.includePC(); // include pc is mandatory
    }
  }

  get stateToInspect(): StateRequest {
    return this._stateToInspect;
  }

  public serializeBinary(): string {
    return `${this.kind}${this.stateToInspect.generateInterrupt()}`;
  }

  description(): string {
    return 'State Inspecting';
  }

  parseSubscriptionData(input: any): WasmState {
    return this.stateToInspect.parse(input);
  }
}
