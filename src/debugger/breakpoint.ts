import { type SourceCodeLocation } from '../source_mappers/source_map';
import { type WasmState } from '../state';
import { StateRequest } from '../warduino/requests/inspect_request';
import { PauseVMHook } from '../hooks/hook_run_pause';
import { type Hook } from '../hooks/hook';
import { InspectStateHook } from '../hooks/hook_inspect_state';

export class Breakpoint {
  public readonly sourceCodeLocation: SourceCodeLocation;
  private _stateOnBreakpoint: StateRequest;

  private readonly onBreakpointHanlders: Array<(state: WasmState) => void>;
  constructor(
    sourceCodeLocation: SourceCodeLocation,
    stateOnBreakpoint?: StateRequest,
  ) {
    this.sourceCodeLocation = sourceCodeLocation;
    this._stateOnBreakpoint =
      stateOnBreakpoint ?? new StateRequest().includePC();
    this.onBreakpointHanlders = [];
  }

  get stateOnBreakpoint(): StateRequest {
    return this._stateOnBreakpoint;
  }

  set stateOnBreakpoint(stateOfInterest: StateRequest) {
    this._stateOnBreakpoint = stateOfInterest;
  }

  get hooks(): Hook[] {
    // defines the behaviour of the breakpoint once reached
    const pause = new PauseVMHook();
    const stateToInspect = new InspectStateHook(this._stateOnBreakpoint);
    stateToInspect.subscribe(this.fanOutState.bind(this));
    return [pause, stateToInspect];
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

  private fanOutState(state: WasmState): void {
    this.onBreakpointHanlders.forEach((h) => {
      h(state);
    });
  }
}
