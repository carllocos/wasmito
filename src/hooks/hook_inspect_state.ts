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
  constructor(stateRequest: StateRequest = new StateRequest()) {
    super(HookKind.StateToInspect);
    this._stateToInspect = stateRequest;
    this._stateToInspect.includePC(); // include pc is mandatory
  }

  get stateToInspect(): StateRequest {
    return this._stateToInspect;
  }

  public serializeBinary(): string {
    const includeInterruptNr = false;
    const includeID = false;
    return `${this.kind}${this.stateToInspect.generateInterrupt(includeInterruptNr, includeID)}`;
  }

  description(): string {
    return `State Inspecting`;
  }

  parseSubscriptionData(input: any): WasmState {
    return this.stateToInspect.parse(input);
  }

  includePC(): this {
    this._stateToInspect.includePC();
    return this;
  }

  includeStack(): this {
    this._stateToInspect.includeStack();
    return this;
  }

  includeCallstack(): this {
    this._stateToInspect.includeCallstack();
    return this;
  }

  includeGlobals(): this {
    this._stateToInspect.includeGlobals();
    return this;
  }

  includeMemory(): this {
    this._stateToInspect.includeMemory();
    return this;
  }

  includeTable(): this {
    this._stateToInspect.includeTable();
    return this;
  }

  includeBranchingTable(): this {
    this._stateToInspect.includeBranchingTable();
    return this;
  }

  includeBreakpoints(): this {
    this._stateToInspect.includeBreakpoints();
    return this;
  }

  includeCallbackMappings(): this {
    this._stateToInspect.includeCallbackMappings();
    return this;
  }

  includeEvents(): this {
    this._stateToInspect.includeEvents();
    return this;
  }

  includeException(): this {
    this._stateToInspect.includeException();
    return this;
  }

  includeLogicalClock(): this {
    this._stateToInspect.includeLogicalClock();
    return this;
  }

  includeHeapFree(): this {
    this._stateToInspect.includeHeapFree();
    return this;
  }
}
