/* eslint-disable @typescript-eslint/no-unused-vars */
import { type Channel } from '../../communication/channel_interface';
import { type APIRequest } from '../request_interface';
import { StateRequest } from '../../runtimes/wasmito_vm/requests/inspect_request';
import { RunRequest } from '../../runtimes/wasmito_vm/requests/run_request';
import { StepRequest } from '../../runtimes/wasmito_vm/requests/step_request';
import { WASM, type WasmState } from '../../../src/webassembly/wasm';
import {
  AddBreakpointRequest,
  RemoveBreakpointRequest,
} from './breakpoint_request';
import { RuntimeToolAPI } from '../runtime_api';
import { Breakpoint } from '../../debugger/breakpoint';
import { BreakpointPolicy } from '../../debugger';
import { Hook } from '../../hooks';
import { SourceCodeLocation } from '../../source_mappers';
import { WASMFunction } from '../../webassembly';
import { ProxyCallResponse } from '../wasmito_vm/requests/fun_call_request';
import { HookOnWasmAddrMoment } from '../wasmito_vm/requests/hook_on_wasm_addr_request';
import { LanguageAdaptor } from '../../language_adaptors';
import { RequestsManager } from '../../communication/requests_manager';
import { SourceCFGNode } from '../../cfg/source_cfg_node_edge';

export class WARDuinoRuntimeAPI implements RuntimeToolAPI {
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

  async addBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number,
  ): Promise<boolean> {
    if (!this.listenerActivated) {
      this.channel.addOnData(this.listenForOnBPReach.bind(this));
      this.listenerActivated = true;
    }

    const addr = breakpoint.wasmAddress;
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

  async removeBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number,
  ): Promise<boolean> {
    const addr = breakpoint.wasmAddress;
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

  async step(timeout?: number): Promise<void> {
    const req = new StepRequest();
    const resp = await this.sendRequest(req, timeout);
    // return resp === 'STEP!';
    return;
  }

  async startRuntime(timeout: number): Promise<boolean> {
    this.bpListeners.length = 0;
    this.removedListeners.clear();
    this.breakpoints.clear();
    this.listenerActivated = false;
    return true;
  }

  async stopRuntime(timeout: number): Promise<boolean> {
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

  pause(timeout?: number): Promise<void> {
    throw new Error('To implement');
  }
  breakpointPolicy(): BreakpointPolicy {
    throw new Error('To implement');
  }
  changeBreakpointPolicy(p: BreakpointPolicy): void {
    throw new Error('To implement');
  }
  proxify(timeout?: number): Promise<void> {
    throw new Error('To implement');
  }
  uploadSourceCode(
    languageAdaptor: LanguageAdaptor,
    timeout?: number,
  ): Promise<boolean> {
    throw new Error('To implement');
  }
  inspect(neededState: StateRequest, timeout?: number): Promise<WasmState> {
    throw new Error('To implement');
  }
  snapshot(timeout?: number): Promise<WasmState> {
    throw new Error('To implement');
  }
  loadWasmState(state: WasmState, timeout?: number): Promise<void> {
    throw new Error('To implement');
  }
  resolveEvent(timeout?: number): Promise<void> {
    throw new Error('To implement');
  }
  unregisterFuncForProxyCall(
    funcToProxy: WASMFunction,
    timeout?: number,
  ): Promise<boolean> {
    throw new Error('To implement');
  }
  registerFuncForProxyCall(
    funcToProxy: WASMFunction,
    timeout?: number,
  ): Promise<boolean> {
    throw new Error('To implement');
  }
  functionsProxied(): Set<WASMFunction> {
    throw new Error('To implement');
  }
  proxyCall(
    funcid: number,
    args: WASM.Value[],
    timeout?: number,
  ): Promise<ProxyCallResponse> {
    throw new Error('To implement');
  }
  addHookBefore(
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    timeout?: number,
  ): Promise<boolean> {
    throw new Error('To implement');
  }
  addHookAfter(
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    timeout?: number,
  ): Promise<boolean> {
    throw new Error('To implement');
  }
  addHookBeforeSrcNode(
    node: SourceCFGNode,
    hook: Hook,
    timeout?: number,
  ): Promise<boolean> {
    throw new Error('To implement');
  }
  addHookOnNewEvent(hook: Hook, timeout?: number): Promise<boolean> {
    throw new Error('To implement');
  }
  addHookOnEventHandling(hook: Hook, timeout?: number): Promise<boolean> {
    throw new Error('To implement');
  }
  addHookOnError(hook: Hook, timeout?: number): Promise<boolean> {
    throw new Error('To implement');
  }
  subscribeOnNewEvent(
    cb: (ev: WASM.Event) => void,
    timeout?: number,
  ): Promise<boolean> {
    throw new Error('To implement');
  }

  addHookOnAddr(
    addr: number,
    hook: Hook,
    moment: HookOnWasmAddrMoment,
    timeout?: number,
  ): Promise<boolean> {
    throw new Error('Operation not supported');
  }

  updateStackValue(stackIdx: number, value: WASM.Value): Promise<boolean> {
    throw new Error('To implement');
  }
}
