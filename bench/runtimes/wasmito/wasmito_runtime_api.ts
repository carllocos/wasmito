import { type RuntimeDebugAPI } from '../runtime_api';
import {
  getHookMomentFromString,
  HookOnWasmAddrMoment,
  HookOnWasmAddrRequest,
  RemoveHookOnWasmAddrRequest,
} from '../../../src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import { type APIRequest } from '../../../src/runtimes/request_interface';
import { PauseVMHook } from '../../../src/hooks/hook_run_pause';
import { RunRequest } from '../../../src/runtimes/wasmito_vm/requests/run_request';
import { StateRequest, StepRequest } from '../../../src/runtimes';
import { type WasmState } from '../../../src/webassembly/wasm';
import { type Channel } from '../../../src/communication/channel_interface';
import { InspectStateHook } from '../../../src/hooks/hook_inspect_state';
import { RequestsManager } from '../../../src/communication/requests_manager';
import {
  createRequestMessage,
  isSubscriptionMessage,
  isSuccessfulMessage,
} from '../../../src/runtimes/request_msg';

export class WasmitoRuntimeDBGAPI implements RuntimeDebugAPI {
  runtimeName: string;
  protected channel: Channel;
  private readonly breakpoints: Set<number>;
  private listenerActivated: boolean;
  private readonly hooksOfBreakpoints: Map<number, HookOnWasmAddrRequest[]>;
  private breakpointListeners: Array<(bpAddr: number) => void>;
  private readonly removedListeners: Set<(bpAddr: number) => void>;
  public bulkRequests: boolean;

  constructor(channel: Channel) {
    this.channel = channel;
    this.runtimeName = '';
    this.breakpoints = new Set();
    this.breakpointListeners = [];
    this.removedListeners = new Set();

    this.listenerActivated = false;
    this.hooksOfBreakpoints = new Map();
    this.bulkRequests = true;
  }

  onBreakpoint(handler: (bpAdrr: number) => void): void {
    this.breakpointListeners.push(handler);
  }

  removeOnBreakpoint(handler: (bpAdrr: number) => void): void {
    this.removedListeners.add(handler);
  }

  private parseBpAddress(data: string): number | undefined {
    // '{"interrupt":"51","kind":"03","sub":{"moment":"01","addr":"3FE","val":{"pc":1022}}}');
    const msg = createRequestMessage(data);
    if (msg === undefined || !isSubscriptionMessage(msg)) {
      return;
    }
    try {
      let subContent: any = {};
      if (typeof msg.sub === 'string') {
        subContent = JSON.parse(msg.sub);
      } else if (typeof msg.sub === 'object') {
        subContent = msg.sub;
      }

      if (
        typeof subContent.moment !== 'string' ||
        subContent.val === undefined
      ) {
        return;
      }
      const hookMoment = getHookMomentFromString(subContent.moment);
      if (hookMoment !== HookOnWasmAddrMoment.HookBefore) {
        return;
      }
      const hookAddr = parseInt(subContent.addr, 16);
      if (isNaN(hookAddr)) {
        throw new Error(
          `Failed to convert hookOnRequest addr ${subContent.addr} to a number`,
        );
      }
      return hookAddr;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return undefined;
    }
  }

  private listenForOnBPReach(data: string): void {
    const bpAddr = this.parseBpAddress(data);
    if (bpAddr === undefined) {
      return;
    }
    this.breakpointListeners.forEach((lstnr) => {
      if (!this.removedListeners.has(lstnr)) {
        lstnr(bpAddr);
      }
    });

    this.breakpointListeners = this.breakpointListeners.filter((h) => {
      return !this.removedListeners.has(h);
    });
    this.removedListeners.clear();
  }

  async startRuntime(_timeout: number): Promise<boolean> {
    this.breakpointListeners.length = 0;
    this.removedListeners.clear();
    this.breakpoints.clear();
    this.hooksOfBreakpoints.clear();
    this.listenerActivated = false;
    return true;
  }

  async stopRuntime(_timeout: number): Promise<boolean> {
    throw new Error('stopRuntime is not applicable to this class');
  }

  private async sendRequest<T>(
    request: APIRequest<T>,
    timeout: number | undefined = undefined,
  ): Promise<T> {
    const command = new RequestsManager();
    return command.sendRequest(
      this.channel,
      request,
      this.bulkRequests,
      timeout,
    );
  }

  async addBreakpoint(addr: number, timeout?: number): Promise<boolean> {
    if (!this.listenerActivated) {
      this.channel.addOnData(this.listenForOnBPReach.bind(this));
      this.listenerActivated = true;
    }
    const inspectHook = new InspectStateHook(new StateRequest().includePC());
    // inspectHook.subscribe(this.subscribeData.bind(this));
    const hooks = [inspectHook, new PauseVMHook()];
    let success = true;
    const reqs: HookOnWasmAddrRequest[] = [];
    for (const h of hooks) {
      const req = new HookOnWasmAddrRequest(addr).addHook(h).before();
      const response = await this.sendRequest(req, timeout);
      success = isSuccessfulMessage(response) && success;
      if (!success) {
        break;
      }
      reqs.push(req);
    }
    if (success) {
      this.breakpoints.add(addr);
      this.hooksOfBreakpoints.set(addr, reqs);
    }
    return success;
  }

  async removeBreakpoint(addr: number, timeout?: number): Promise<boolean> {
    const req = new RemoveHookOnWasmAddrRequest(addr).before();
    const response = await this.sendRequest(req, timeout);
    const success = isSuccessfulMessage(response);
    if (success) {
      this.breakpoints.delete(addr);
      const reqs: HookOnWasmAddrRequest[] =
        this.hooksOfBreakpoints.get(addr) ?? [];
      for (const r of reqs) {
        r.closeSubscription();
      }
      this.hooksOfBreakpoints.delete(addr);
    }
    return success;
  }

  async run(timeout?: number): Promise<boolean> {
    const req = new RunRequest();
    return await this.sendRequest(req, timeout);
  }

  async step(timeout?: number): Promise<boolean> {
    const req = new StepRequest();
    const response = await this.sendRequest(req, timeout);
    if (!response) {
      throw new Error(`Wasmito runtime failed to step`);
    }
    return true;
  }

  async inspectPC(timeout?: number): Promise<number> {
    const req = new StateRequest();
    req.includePC();
    const response: WasmState = await this.sendRequest(req, timeout);
    if (response.pc === undefined) {
      throw new Error(`Failed to inpsect PC`);
    }
    return response.pc;
  }
}
