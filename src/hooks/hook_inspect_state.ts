import { type WasmState } from '../webassembly/wasm';
import {
  StateRequest,
  WasmStateI,
} from '../runtimes/wasmito_vm/requests/inspect_request';
import { HookKind, HookWithSubscription } from './hook';

export class InspectStateHook
  extends HookWithSubscription<WasmState>
  implements WasmStateI<InspectStateHook>
{
  private readonly _stateToInspect: StateRequest;
  public readonly wasmAddress?: number;
  constructor(
    stateRequest: StateRequest = new StateRequest(),
    wasmAddress?: number,
  ) {
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

  includePC(): InspectStateHook {
    this._stateToInspect.includePC();
    return this;
  }

  includeStack(): InspectStateHook {
    this._stateToInspect.includeStack();
    return this;
  }

  includeCallstack(): InspectStateHook {
    this._stateToInspect.includeCallstack();
    return this;
  }

  includeGlobals(): InspectStateHook {
    this._stateToInspect.includeGlobals();
    return this;
  }

  includeMemory(): InspectStateHook {
    this._stateToInspect.includeMemory();
    return this;
  }

  includeTable(): InspectStateHook {
    this._stateToInspect.includeTable();
    return this;
  }

  includeBranchingTable(): InspectStateHook {
    this._stateToInspect.includeBranchingTable();
    return this;
  }

  includeBreakpoints(): InspectStateHook {
    this._stateToInspect.includeBreakpoints();
    return this;
  }

  includeCallbackMappings(): InspectStateHook {
    this._stateToInspect.includeCallbackMappings();
    return this;
  }

  includeEvents(): InspectStateHook {
    this._stateToInspect.includeEvents();
    return this;
  }

  includeException(): InspectStateHook {
    this._stateToInspect.includeException();
    return this;
  }

  includeLogicalClock(): InspectStateHook {
    this._stateToInspect.includeLogicalClock();
    return this;
  }
}
