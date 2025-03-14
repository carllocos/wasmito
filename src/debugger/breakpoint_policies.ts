import type winston from 'winston';
import { RemoveHookOnWasmAddrRequest } from '../warduino/requests/hook_on_wasm_addr_request';
import { type Breakpoint } from './breakpoint';
import { createLogger } from '../logger/logger';
import { InspectStateHook } from '../hooks/hook_inspect_state';
import { type WasmState } from '../webassembly';
import { type WARDuinoVM } from '../warduino/vm/warduino_vm';
import { isSuccessfulMessage } from '../warduino/api/request_interface';
import { StateRequest } from '../warduino/requests/inspect_request';
import { PauseVMHook } from '../hooks/hook_run_pause';
import { type SourceCodeLocation } from '../source_mappers';

export abstract class BreakpointPolicy {
  protected readonly vm: WARDuinoVM;
  protected readonly MAX_DEFAULT_TIMEOUT: number = 10000;
  protected abstract readonly logger: winston.Logger;

  protected _breakpoints: Breakpoint[];
  private readonly onAddBpListeners: Array<(bp: Breakpoint) => void>;
  private readonly onRemoveBPListeners: Array<(bp: Breakpoint) => void>;

  constructor(vm: WARDuinoVM) {
    this.vm = vm;
    this._breakpoints = [];
    this.onAddBpListeners = [];
    this.onRemoveBPListeners = [];
  }

  get breakpoints(): Breakpoint[] {
    return this._breakpoints;
  }

  abstract toString(): string;

  activate(_: Breakpoint[]): void {}

  deactivate(): void {}

  async addBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number,
  ): Promise<boolean> {
    if (this.hasBreakpoint(breakpoint)) {
      this.logger.warn(`breakpoint was already set ${breakpoint.toString()}`);
      return true;
    }
    let successful = true;
    for (let i = 0; i < breakpoint.hooks.length; i++) {
      const hook = breakpoint.hooks[i];
      successful = await this.vm.addHookBefore(
        breakpoint.sourceCodeLocation,
        hook,
        timeout,
      );
      if (!successful) {
        this.logger.error(`could not add breakpoint ${breakpoint.toString()}`);
        break;
      }
    }

    if (successful) {
      this.logger.info(`breakpoint added ${breakpoint.toString()}`);
      this.breakpoints.push(breakpoint);
      this.informListenersOfAddBp(breakpoint);
    } else {
      this.logger.error(`could not add breakpoint ${breakpoint.toString()}`);
    }
    return successful;
  }

  async removeBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number,
  ): Promise<boolean> {
    if (!this.hasBreakpoint(breakpoint)) {
      this.logger.info(
        `no breakpoint ${breakpoint.toString()} was previously set so nothing to remove`,
      );
      return false;
    }
    const sm = this.vm.sourceMap;

    let mappings: SourceCodeLocation[] = [];
    if (breakpoint.sourceCodeLocation.address > 0) {
      mappings = sm.getOriginalPositionFor(
        breakpoint.sourceCodeLocation.address,
      );
    }
    if (mappings.length === 0) {
      mappings = sm.generatedPositionFor(breakpoint.sourceCodeLocation);
    }

    let addr = -1;
    if (mappings.length > 0) {
      addr = mappings[0].address;
    } else {
      // might not be a sourcemap and user is targeting a wasm addr

      const instr = sm.wasm.getInstruction(
        breakpoint.sourceCodeLocation.address,
      );
      if (instr === undefined) {
        throw new Error(
          `Cannot remove breakpoint on an inexistent wasm address derived from breakpoint ${breakpoint.toString()}`,
        );
      }
      addr = instr.startAddress;
    }

    const request = new RemoveHookOnWasmAddrRequest(addr).before();

    const response = await this.vm.sendRequest(request, timeout);
    const successful = isSuccessfulMessage(response);
    if (successful) {
      const hooksRequests = this.vm.hooksStore.get(addr) ?? [];
      for (const hq of hooksRequests) {
        hq.closeSubscription();
      }
      if (hooksRequests.length > 0) {
        this.vm.hooksStore.set(addr, []);
      }
      this._breakpoints = this._breakpoints.filter((b) => {
        return !breakpoint.equals(b);
      });
      this.logger.info(`breakpoint removed ${breakpoint.toString()}`);
      this.informListenersOfRemoveBp(breakpoint);
    }

    return successful;
  }

  onBreakpointAdd(cb: (bp: Breakpoint) => void): void {
    this.onAddBpListeners.push(cb);
  }

  onBreakpointRemove(cb: (bp: Breakpoint) => void): void {
    this.onRemoveBPListeners.push(cb);
  }

  hasBreakpoint(bp: Breakpoint): boolean {
    const found = this._breakpoints.find((b) => {
      return bp.equals(b);
    });

    return found !== undefined;
  }

  private informListenersOfAddBp(breakpoint: Breakpoint): void {
    for (let i = 0; i < this.onAddBpListeners.length; i++) {
      const cb = this.onAddBpListeners[i];
      cb(breakpoint);
    }
  }

  private informListenersOfRemoveBp(breakpoint: Breakpoint): void {
    for (let i = 0; i < this.onRemoveBPListeners.length; i++) {
      const cb = this.onRemoveBPListeners[i];
      cb(breakpoint);
    }
  }
}

export class BreakpointDefaultPolicy extends BreakpointPolicy {
  readonly logger: winston.Logger = createLogger('DefaultBreakpointPolicy');

  toString(): string {
    return 'Default Breakpoint Policy';
  }
}

/*
 * SingleStopBreakpointPolicy
 * ensures that newly added breakpoints upon a VM will
 * 1. drop a snapshot once they are hit
 * 2. configure the breakpoints to remove themselves once hit from within the VM
 * 3. Keep the application running where the breakpoint got hit
 * 4. Removes all the other breakpoints from the VM.
 */
export class SingleStopBreakpointPolicy extends BreakpointPolicy {
  readonly logger: winston.Logger = createLogger('SingleStopBreakpointPolicy');

  private readonly removeAllBreakpointsCallback: (state: WasmState) => void;

  constructor(vm: WARDuinoVM) {
    super(vm);
    this.removeAllBreakpointsCallback = (state: WasmState) => {
      this.removeAllBreakpoints();
    };
  }

  override activate(startingBreakpoints: Breakpoint[]): void {
    /*
     * It may be that when this policy is activated some breakpoints may already have been set on the VM.
     * For these breakpoints, the policy ensures that all the breakpoints get removed once one of them get hit.
     */
    startingBreakpoints.forEach((bp) => {
      bp.subscribe(this.removeAllBreakpointsCallback);
    });
    this._breakpoints = startingBreakpoints;
  }

  override deactivate(): void {
    this.breakpoints.forEach((bp) => {
      bp.unSubscribe(this.removeAllBreakpointsCallback);
    });
  }

  toString(): string {
    return 'Single Stop Breakpoint Policy';
  }

  async addBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number,
  ): Promise<boolean> {
    const bp = this.adaptBreakpoint(breakpoint);
    return await super.addBreakpoint(bp, timeout);
  }

  private adaptBreakpoint(breakpoint: Breakpoint): Breakpoint {
    const bp = makeBreakpointThrowSnapshotAndRun(breakpoint);
    bp.subscribe(this.removeAllBreakpointsCallback);
    return bp;
  }

  private removeAllBreakpoints(): void {
    this.logger.info(`Enforcing '${this.toString()}'`);
    const removes = this.vm.breakpoints.map(async (bp) => {
      return this.vm.removeBreakpoint(bp, this.MAX_DEFAULT_TIMEOUT);
    });

    Promise.all(removes).catch((err) => {
      this.logger.error(
        `Error occurred while enforcing '${this.toString()}'. Error`,
        err,
      );
    });
  }
}

/*
 * RemoveAndProceedBreakpointPolicy
 * ensures that newly added breakpoints upon a VM will
 * 1. drop a snapshot once they are hit
 * 2. configure the breakpoints to remove themselves once hit from within the VM
 * 3. Keep the application running where the breakpoint got hit
 */
export class RemoveAndProceedBreakpointPolicy extends BreakpointPolicy {
  readonly logger: winston.Logger = createLogger(
    'RemoveAndProceedBreakpointPolicy',
  );

  private readonly removeBPOnReachMap: Map<
    Breakpoint,
    (state: WasmState) => void
  >;

  constructor(vm: WARDuinoVM) {
    super(vm);
    this.removeBPOnReachMap = new Map();
  }

  override activate(startingBreakpoints: Breakpoint[]): void {
    /*
     * It may be that when this policy is activated some breakpoints may already have been set on the VM.
     * For these breakpoints, the policy sends a remove request to the VM once they get hit.
     * Which is different from breakpoints added while the policy is active as they are selfdestructing.
     */
    startingBreakpoints
      .filter((bp) => {
        return bp.hooks.find((h) => h instanceof PauseVMHook) !== undefined;
      })
      .forEach((bp) => {
        bp.subscribe(this.createRemoveBPOnReachCallback(bp));
      });
    this._breakpoints = startingBreakpoints;
  }

  override deactivate(): void {
    for (const [bp, cb] of this.removeBPOnReachMap) {
      bp.unSubscribe(cb);
    }
    this.removeBPOnReachMap.clear();
  }

  async addBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number,
  ): Promise<boolean> {
    const bp = makeBreakpointThrowSnapshotAndRun(breakpoint);
    return await super.addBreakpoint(bp, timeout);
  }

  toString(): string {
    return 'Remove And Proceed Breakpoint Policy.';
  }

  private createRemoveBPOnReachCallback(
    bp: Breakpoint,
  ): (state: WasmState) => void {
    const cb = (_: WasmState): void => {
      this.vm
        .removeBreakpoint(bp, this.MAX_DEFAULT_TIMEOUT)
        .then((removed) => {
          if (removed) {
            this.removeBPOnReachMap.delete(bp);
          }
        })
        .catch((err) => {
          throw err;
        });
    };

    this.removeBPOnReachMap.set(bp, cb);
    return cb;
  }
}

function makeBreakpointThrowSnapshotAndRun(breakpoint: Breakpoint): Breakpoint {
  // The following ensures that the breakpoint once it is reached it
  // 1. throws a snapshot
  // 2 The VM does not pause but instead continues running.
  const newHooks = [];
  const inspectHook = breakpoint.hooks.find(
    (h) => h instanceof InspectStateHook,
  );
  if (inspectHook === undefined) {
    const h = new InspectStateHook(new StateRequest().includeAll());
    h.scheduleOnce();
    newHooks.push(h);
  } else {
    inspectHook.stateToInspect.includeAll();
    inspectHook.scheduleOnce();
    newHooks.push(inspectHook);
  }
  breakpoint.hooks = newHooks;
  return breakpoint;
}
