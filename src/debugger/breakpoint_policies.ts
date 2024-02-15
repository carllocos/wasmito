export enum BreakpointPolicy {
  DefaultPolicy,
  SingleStop,
  StopAndProceed,
}

export class BreakpointFactory {
  private _policy: BreakpointPolicy;
  constructor(policy: BreakpointPolicy) {
    this._policy = policy;
  }

  get policy(): BreakpointPolicy {
    return this._policy;
  }

  set policy(p: BreakpointPolicy) {
    this._policy = p;
  }
}
