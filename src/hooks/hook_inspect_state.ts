import { type WasmState } from '../state/wasm';
import { type StateRequest } from '../warduino/requests/inspect_request';
import { HookKind, HookWithSubscription } from './hook';

export class InspectStateHook extends HookWithSubscription<WasmState> {
  public readonly stateToInspect: StateRequest;
  public readonly wasmAddress?: number;
  constructor(stateRequest: StateRequest, wasmAddress?: number) {
    super(HookKind.StateToInspect);
    this.stateToInspect = stateRequest;
    this.wasmAddress = wasmAddress;
    if (this.wasmAddress !== undefined) {
      this.stateToInspect.includePC(); // include pc is mandatory
    }
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
