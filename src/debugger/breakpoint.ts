import { type SourceCodeLocation } from '../source_mappers/source_map';
import { type WasmState } from '../state';
import { StateRequest } from '../warduino/requests/inspect_request';
import { PauseVMHook } from '../hooks/hook_run_pause';
import { type ISubscription, type Hook } from '../hooks/hook';
import { InspectStateHook } from '../hooks/hook_inspect_state';
import { createLogger } from '../logger/logger';
import type winston from 'winston';

// TODO reimplement as extension to HookWithSub? Although this is bound to an address and should be extensible to support binding to events
export class Breakpoint implements ISubscription<WasmState> {
  public readonly sourceCodeLocation: SourceCodeLocation;
  protected _stateOnBreakpoint: StateRequest;

  private readonly pauseHook: PauseVMHook;
  protected readonly inspectHook: InspectStateHook;
  protected logger: winston.Logger;
  private readonly removedListeners: Set<(data: WasmState) => void>;

  private listeners: Array<(state: WasmState) => void>;
  constructor(
    sourceCodeLocation: SourceCodeLocation,
    stateOnBreakpoint?: StateRequest,
  ) {
    this.sourceCodeLocation = sourceCodeLocation;
    this._stateOnBreakpoint =
      stateOnBreakpoint ?? new StateRequest().includePC();
    this.listeners = [];
    this.pauseHook = new PauseVMHook();
    this.inspectHook = this.prepareInspectHook();
    this.logger = createLogger('Breakpoint');
    this.removedListeners = new Set();
  }

  parseSubscriptionData(input: any): WasmState {
    throw new Error('Method should not be called');
  }

  public subscribe(callback: (data: WasmState) => void): void {
    const found = this.listeners.find((cb) => cb === callback);
    if (found !== undefined) {
      this.logger.warn(`Attempting to add 2 same subscription callbacks`);
      return;
    }

    this.listeners.push(callback);
  }

  public unSubscribe(callback: (data: WasmState) => void): void {
    this.removedListeners.add(callback);
  }

  onSubscriptionData(value: WasmState): void {
    if (this.listeners.length === 0) {
      this.logger.warn('There is no listener for subscription content');
    }
    this.listeners.forEach((listener) => {
      if (!this.removedListeners.has(listener)) {
        listener(value);
      }
    });
    this.listeners = this.listeners.filter((cb) => {
      return !this.removedListeners.has(cb);
    });
    this.removedListeners.clear();
  }

  get stateOnBreakpoint(): StateRequest {
    return this._stateOnBreakpoint;
  }

  get hooks(): Hook[] {
    return [this.pauseHook, this.inspectHook];
  }

  equals(other: Breakpoint): boolean {
    const thisLoc = this.sourceCodeLocation;
    const otherLoc = other.sourceCodeLocation;
    return (
      thisLoc.linenr === otherLoc.linenr &&
      thisLoc.columnEnd === otherLoc.columnEnd &&
      thisLoc.columnStart === otherLoc.columnStart
    );
  }

  toString(): string {
    const loc = this.sourceCodeLocation;
    let s = `{linenr: ${loc.linenr}`;
    if (loc.columnStart !== undefined) {
      s += ` ,columnStart ${loc.columnStart}`;
    }
    if (loc.columnEnd !== undefined) {
      s += ` ,columnEnd ${loc.columnEnd}`;
    }
    s += '}';
    return s;
  }

  private prepareInspectHook(): InspectStateHook {
    // defines the behaviour of the breakpoint once reached
    const hook = new InspectStateHook(this._stateOnBreakpoint);
    hook.subscribe(this.onSubscriptionData.bind(this));
    return hook;
  }
}

export class BreakpointRemoveAndProceed extends Breakpoint {
  constructor(location: SourceCodeLocation) {
    super(location);
    this._stateOnBreakpoint.includeAll();
    this.inspectHook.scheduleOnce();
  }

  get stateOnBreakpoint(): StateRequest {
    const req = new StateRequest();
    req.includeAll();
    return req;
  }

  get hooks(): Hook[] {
    // once bp reached make sure to leave the running state as is
    return [this.inspectHook];
  }

  // private createStateToInspectHook(): InspectStateHook {
  //   const hook = new InspectStateHook(this._stateOnBreakpoint);
  //   hook.scheduleOnce();
  //   hook.subscribe(this.onSubscriptionData.bind(this));
  //   return hook;
  // }
}
