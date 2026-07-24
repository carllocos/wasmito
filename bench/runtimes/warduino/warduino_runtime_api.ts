import { type Channel } from '../../../src/communication/channel_interface';
import { RequestsManager } from '../../../src/communication/requests_manager';
import { type APIRequest } from '../../../src/runtimes/request_interface';
import { StateRequest } from '../../../src/runtimes/wasmito_vm/requests/inspect_request';
import { RunRequest } from '../../../src/runtimes/wasmito_vm/requests/run_request';
import { StepRequest } from '../../../src/runtimes/wasmito_vm/requests/step_request';
import { type WasmState } from '../../../src/webassembly/wasm';
import { type RuntimeDebugAPI } from '../runtime_api';
import {
  AddBreakpointRequest,
  RemoveBreakpointRequest,
} from './breakpoint_request';

export class WARDuinoRuntimeAPI implements RuntimeDebugAPI {
  runtimeName: string;
  protected channel: Channel;
  private listenerActivated: boolean;
  private readonly breakpoints: Set<number>;

  private bpListeners: Array<(bpAddr: number) => void>;
  private readonly removedListeners: Set<(bpAddr: number) => void>;
  public bulkRequests: boolean;

  constructor(channel: Channel) {
    this.channel = channel;
    this.runtimeName = '';
    this.listenerActivated = false;
    this.removedListeners = new Set();
    this.bpListeners = [];
    this.breakpoints = new Set();
    this.bulkRequests = true;
  }

  private listenForOnBPReach(data: string): void {
    const match = data.match(/^AT (\d+)!$/);
    if (match !== undefined && match !== null) {
      const bpAddr = parseInt(match[1]);
      if (isNaN(bpAddr)) {
        throw new Error(`Could not parse BP address '${match[1]}' to a number`);
      }
      this.bpListeners.forEach((lstnr) => {
        if (!this.removedListeners.has(lstnr)) {
          lstnr(bpAddr);
        }
      });

      this.bpListeners = this.bpListeners.filter((h) => {
        return !this.removedListeners.has(h);
      });
      this.removedListeners.clear();
    }
  }

  async addBreakpoint(addr: number, timeout?: number): Promise<boolean> {
    if (!this.listenerActivated) {
      this.channel.addOnData(this.listenForOnBPReach.bind(this));
      this.listenerActivated = true;
    }

    const req = new AddBreakpointRequest(addr);
    const resp = await this.sendRequest(req, timeout);
    if (resp === addr) {
      this.breakpoints.add(addr);
      // if (!this.listenerActivated) {
      //   this.listenerActivated = true;
      // }
      return true;
    }
    return false;
  }

  async removeBreakpoint(addr: number, timeout?: number): Promise<boolean> {
    const req = new RemoveBreakpointRequest(addr);
    const resp = await this.sendRequest(req, timeout);
    if (resp === addr) {
      this.breakpoints.delete(addr);
      // if (this.breakpoints.size === 0) {
      //   this.channel.removeOnData(this.listenForOnBPReach.bind(this));
      //   this.listenerActivated = false;
      // }
      return true;
    }
    return false;
  }

  onBreakpoint(handler: (bpAdrr: number) => void): void {
    this.bpListeners.push(handler);
  }

  removeOnBreakpoint(handler: (bpAdrr: number) => void): void {
    this.removedListeners.add(handler);
  }

  async run(timeout?: number): Promise<boolean> {
    const req = new RunRequest();
    return await this.sendRequest(req, timeout);
  }

  async inspectPC(timeout?: number): Promise<number> {
    const req = new StateRequest();
    req.includePC();
    const resp: WasmState = await this.sendRequest(req, timeout);
    if (resp.pc === undefined) {
      throw new Error(`InspectPC failed in to return`);
    }
    return resp.pc;
  }

  async step(timeout?: number): Promise<boolean> {
    const req = new StepRequest();
    return await this.sendRequest(req, timeout);
  }

  async startRuntime(_timeout: number): Promise<boolean> {
    this.bpListeners.length = 0;
    this.removedListeners.clear();
    this.breakpoints.clear();
    this.listenerActivated = false;
    return true;
  }

  async stopRuntime(_timeout: number): Promise<boolean> {
    throw new Error('stopRuntime is not applicable to this class');
  }

  private async sendRequest<T>(
    request: APIRequest<T>,
    timeout?: number,
  ): Promise<T> {
    const command = new RequestsManager();
    return command.sendRequest(
      this.channel,
      request,
      this.bulkRequests,
      timeout,
    );
  }
}
