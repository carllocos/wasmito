import { type WasmState } from '../state/wasm';
import { type StateRequest } from '../warduino/requests/inspect_request';
import { HookKind, HookWithSubscription } from './hook';

export class InspectStateHook extends HookWithSubscription<WasmState> {
  private readonly req: StateRequest;
  public readonly wasmAddress?: number;
  constructor(stateRequest: StateRequest, wasmAddress?: number) {
    super(HookKind.StateToInspect);
    this.req = stateRequest;
    this.wasmAddress = wasmAddress;
    if (this.wasmAddress !== undefined) {
      this.req.includePC(); // include pc is mandatory
    }
  }

  public serializeBinary(): string {
    return `${this.kind}${this.req.generateInterrupt()}`;
  }

  description(): string {
    return 'State Inspecting';
  }

  parseSubscriptionData(input: any): WasmState {
    return this.req.parse(input);
  }
}
