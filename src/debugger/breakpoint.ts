import { type SourceCodeLocation } from '../source_mappers/source_map';
import { type WasmState } from '../state';
import { StateRequest } from '../warduino/requests/inspect_request';
import { PauseVMHook } from '../hooks/hook_run_pause';
import { type Hook } from '../hooks/hook';
import { InspectStateHook } from '../hooks/hook_inspect_state';

export class Breakpoint {
  public readonly sourceCodeLocation: SourceCodeLocation;
  protected _stateOnBreakpoint: StateRequest;

  private readonly pauseHook: PauseVMHook;
  private readonly inspectHook: InspectStateHook;

  private readonly onBreakpointHanlders: Array<(state: WasmState) => void>;
  constructor(
    sourceCodeLocation: SourceCodeLocation,
    stateOnBreakpoint?: StateRequest,
  ) {
    this.sourceCodeLocation = sourceCodeLocation;
    this._stateOnBreakpoint =
      stateOnBreakpoint ?? new StateRequest().includePC();
    this.onBreakpointHanlders = [];
    this.pauseHook = new PauseVMHook();
    this.inspectHook = this.prepareInspectHook();
  }

  get stateOnBreakpoint(): StateRequest {
    return this._stateOnBreakpoint;
  }

  get hooks(): Hook[] {
    return [this.pauseHook, this.inspectHook];
  }

  onBreakpoint(cb: (state: WasmState) => void): void {
    this.onBreakpointHanlders.push(cb);
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

  protected fanOutState(state: WasmState): void {
    this.onBreakpointHanlders.forEach((h) => {
      h(state);
    });
  }

  private prepareInspectHook(): InspectStateHook {
    // defines the behaviour of the breakpoint once reached
    const hook = new InspectStateHook(this._stateOnBreakpoint);
    hook.subscribe(this.fanOutState.bind(this));
    return hook;
  }
}

export class BreakpointSingleStop extends Breakpoint {
  private readonly stateToInspectHook: InspectStateHook;
  constructor(location: SourceCodeLocation) {
    super(location);
    this._stateOnBreakpoint.includeAll();
    this.stateToInspectHook = this.createStateToInspectHook();
  }

  get stateOnBreakpoint(): StateRequest {
    const req = new StateRequest();
    req.includeAll();
    return req;
  }

  // set stateOnBreakpoint(stateOfInterest: StateRequest) {
  //   throw new Error('cannot modify the state');
  // }

  get hooks(): Hook[] {
    // once bp reached make sure to leave the running state as is
    return [this.stateToInspectHook];
  }

  private createStateToInspectHook(): InspectStateHook {
    const hook = new InspectStateHook(this._stateOnBreakpoint);
    hook.scheduleOnce();
    hook.subscribe(this.fanOutState.bind(this));
    return hook;
  }
}
