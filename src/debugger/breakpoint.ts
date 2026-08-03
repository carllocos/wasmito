import { type WasmState } from '../webassembly';
import { StateRequest } from '../runtimes/wasmito_vm/requests/inspect_request';
import { PauseVMHook } from '../hooks/hook_run_pause';
import { SubscriptionContent, type Hook } from '../hooks/hook';
import { InspectStateHook } from '../hooks/hook_inspect_state';
import { createLogger, Logger } from '../logger/logger';
import {
  sourceCodeLocationToString,
  strictEqualSourceCodeLocations,
  type SourceCodeLocation,
} from '../source_mappers/source_map';
import {
  HookOnAddrSubContent,
  HookOnWasmAddrRequest,
} from '../runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import { ISubscription } from '../hooks/isubscribe';

// TODO reimplement as extension to HookWithSub? Although this is bound to an address and should be extensible to support binding to events
export class Breakpoint
  implements
    ISubscription<
      SubscriptionContent<HookOnAddrSubContent, any>,
      SubscriptionContent<HookOnAddrSubContent, WasmState>
    >
{
  protected logger: Logger;

  public readonly sourceCodeLocation: SourceCodeLocation;
  private _hooks: Hook[];
  private readonly removedListeners: Set<
    (data: SubscriptionContent<HookOnAddrSubContent, WasmState>) => void
  >;

  protected readonly fanOutToListeners: (
    state: SubscriptionContent<HookOnAddrSubContent, WasmState>,
  ) => Promise<void>;

  private listeners: Array<
    (sub: SubscriptionContent<HookOnAddrSubContent, WasmState>) => void
  >;
  constructor(
    sourceCodeLocation: SourceCodeLocation,
    stateOnBreakpoint?: StateRequest,
  ) {
    this.logger = createLogger('Breakpoint');
    this.sourceCodeLocation = sourceCodeLocation;
    this.fanOutToListeners = this.onSubscriptionData.bind(this);
    this.removedListeners = new Set();
    this.listeners = [];
    this._hooks = this.createHooks(stateOnBreakpoint);
  }

  get wasmAddress(): number {
    return this.sourceCodeLocation.address;
  }

  private createHooks(sttateOnBreakpoint?: StateRequest): Hook[] {
    const stateOnBreakpoint = sttateOnBreakpoint ?? this.createStateRequest();
    const inspectStateHook: InspectStateHook<HookOnAddrSubContent> =
      new InspectStateHook(stateOnBreakpoint);

    // careful:
    // do not use subscribe(this.onSubscriptionData.bind(this))
    // it creates new function per call which can causes duplicate fan out behaviour
    inspectStateHook.subscribe(this.fanOutToListeners);
    return [inspectStateHook, new PauseVMHook()];
  }

  private createStateRequest(): StateRequest {
    return new StateRequest()
      .includePC()
      .includeStack()
      .includeCallstack()
      .includeGlobals()
      .includeEvents();
  }

  parseSubscriptionData(
    _input: SubscriptionContent<HookOnAddrSubContent, any>,
  ): SubscriptionContent<HookOnAddrSubContent, WasmState> {
    throw new Error('Method should not be called');
  }

  public subscribe(
    callback: (
      data: SubscriptionContent<HookOnAddrSubContent, WasmState>,
    ) => void,
  ): void {
    const found = this.listeners.find((cb) => cb === callback);
    if (found !== undefined) {
      this.logger.warn(`Attempting to add 2 same subscription callbacks`);
      return;
    }

    this.listeners.push(callback);
  }

  public unSubscribe(
    callback: (
      data: SubscriptionContent<HookOnAddrSubContent, WasmState>,
    ) => void,
  ): void {
    this.removedListeners.add(callback);
  }

  async onSubscriptionData(
    value: SubscriptionContent<HookOnAddrSubContent, WasmState>,
  ): Promise<void> {
    if (this.listeners.length === 0) {
      this.logger.warn('There is no listener for subscription content');
    }
    this.listeners.forEach(async (listener) => {
      if (!this.removedListeners.has(listener)) {
        await listener(value);
      }
    });
    this.listeners = this.listeners.filter((cb) => {
      return !this.removedListeners.has(cb);
    });
    this.removedListeners.clear();
  }

  clearSubscriptions(): void {
    this.listeners.length = 0;
    this.removedListeners.clear();
  }

  get hooks(): Hook[] {
    return this._hooks;
  }

  set hooks(newHooks: Hook[]) {
    const inspectHook = newHooks.find((h) => h instanceof InspectStateHook);
    if (inspectHook === undefined) {
      throw Error(`One Inspect State Hook is at least required`);
    }

    inspectHook.subscribe(this.fanOutToListeners);
    this._hooks = newHooks;
  }

  equals(other: Breakpoint): boolean {
    const thisLoc = this.sourceCodeLocation;
    const otherLoc = other.sourceCodeLocation;
    return strictEqualSourceCodeLocations(thisLoc, otherLoc);
  }

  toString(): string {
    return sourceCodeLocationToString(this.sourceCodeLocation);
  }

  createRequests(): HookOnWasmAddrRequest[] {
    const requests: HookOnWasmAddrRequest[] = [];
    for (const hook of this.hooks) {
      const req = new HookOnWasmAddrRequest(this.sourceCodeLocation.address)
        .addHook(hook)
        .before();
      requests.push(req);
    }
    return requests;
  }
}
