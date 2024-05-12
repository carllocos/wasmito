import { type WasmState } from '../webassembly';
import { StateRequest } from '../warduino/requests/inspect_request';
import { PauseVMHook } from '../hooks/hook_run_pause';
import { type ISubscription, type Hook } from '../hooks/hook';
import { InspectStateHook } from '../hooks/hook_inspect_state';
import { createLogger } from '../logger/logger';
import type winston from 'winston';
import { type SourceCodeLocation } from '../source_mappers/source_map';

// TODO reimplement as extension to HookWithSub? Although this is bound to an address and should be extensible to support binding to events
export class Breakpoint implements ISubscription<WasmState> {
  protected logger: winston.Logger;

  public readonly sourceCodeLocation: SourceCodeLocation;
  private _hooks: Hook[];
  private readonly removedListeners: Set<(data: WasmState) => void>;

  protected readonly fanOutToListeners: (state: WasmState) => void;

  private listeners: Array<(state: WasmState) => void>;
  constructor(
    sourceCodeLocation: SourceCodeLocation,
    stateOnBreakpoint?: StateRequest,
  ) {
    this.logger = createLogger('Breakpoint');
    this.sourceCodeLocation = sourceCodeLocation;
    this.fanOutToListeners = (state: WasmState) => {
      this.onSubscriptionData(state);
    };
    this.removedListeners = new Set();
    this.listeners = [];
    this._hooks = this.createHooks(stateOnBreakpoint);
  }

  private createHooks(sttateOnBreakpoint?: StateRequest): Hook[] {
    const stateOnBreakpoint = sttateOnBreakpoint ?? this.createStateRequest();
    const inspectStateHook = new InspectStateHook(stateOnBreakpoint);

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

  get hooks(): Hook[] {
    return this._hooks;
  }

  set hooks(newHooks: Hook[]) {
    const inspectHook = newHooks.find((h) => h instanceof InspectStateHook);
    if (inspectHook === undefined) {
      throw Error(`One Inspect State Hook is at least required`);
    }

    const hook = inspectHook as InspectStateHook;
    hook.subscribe(this.fanOutToListeners);
    this._hooks = newHooks;
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
}
