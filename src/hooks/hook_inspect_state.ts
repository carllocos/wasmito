import { type WasmState } from '../webassembly/wasm';
import {
  InspectableState,
  StateRequest,
  WasmStateI,
} from '../runtimes/wasmito_vm/requests/inspect_request';
import { HookKind, HookWithSubscription, SubscriptionContent } from './hook';

export class InspectStateHook<HookMetadata>
  extends HookWithSubscription<HookMetadata, WasmState>
  implements WasmStateI<InspectStateHook<HookMetadata>>
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

  public doesInclude(s: InspectableState): boolean {
    return this._stateToInspect.doesInclude(s);
  }

  public serializeBinary(): string {
    const includeInterruptNr = false;
    const includeID = false;
    return `${this.kind}${this.stateToInspect.generateInterrupt(includeInterruptNr, includeID)}`;
  }

  description(): string {
    return `State Inspecting`;
  }

  parseSubscriptionData(
    msg: SubscriptionContent<HookMetadata, any>,
  ): SubscriptionContent<HookMetadata, WasmState> {
    const parsed = this.stateToInspect.parse(msg.sub);
    return {
      msg: msg.msg,
      metadata: msg.metadata,
      sub: parsed,
    };
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
