import type winston from 'winston';
import { type Channel } from '../../communication/channel_interface';
import { type WasmRuntimeAPI } from '../api/warduino_api';
import { RunRequest } from '../requests/run_request';
import { StepRequest } from '../requests/step_request';
import {
  isSuccessfulMessage,
  type APIRequest,
  ResponseType,
} from '../api/request_interface';
import { Command } from '../../communication/command';
import { type Platform } from '../../platforms/platform';
import { PauseRequest } from '../requests/pause_request';
import { ProxifyRequest } from '../requests/proxify_request';
import { type WASM, type WasmState } from '../../webassembly/wasm';
import { StateRequest } from '../requests/inspect_request';
import { LoadStateRequestBuilder } from '../requests/load_state_request';
import { timeoutPromise } from '../../util/promise_util';
import { ResolveEventRequest } from '../requests/resolve_event_request';
import {
  HookOnWasmAddrMoment,
  HookOnWasmAddrRequest,
} from '../requests/hook_on_wasm_addr_request';
import { ProxyCallHook } from '../../hooks/hook_proxy_call';
import { AroundFunctionRequest } from '../requests/around_function_request';
import {
  ProxyCallRequest,
  type ProxyCallResponse,
} from '../requests/fun_call_request';
import {
  HookOnEventRequest,
  isSuccessfullHookOnEventResponse,
} from '../requests/hook_on_event_request';
import {
  type BreakpointPolicy,
  BreakpointDefaultPolicy,
} from '../../debugger/breakpoint_policies';
import { type Breakpoint } from '../../debugger/breakpoint';
import { type Hook } from '../../hooks/hook';
import {
  HookOnError,
  isSuccessfullHookOnErrorResponse,
} from '../requests/hook_on_error';
import { EventInspectHook } from '../../hooks/hook_event';
import { type DeviceIdentity } from '../../device';
import { type WASMFunction } from '../../webassembly/wasm/wasm_function';
import {
  sourceCodeLocationToString,
  type SourceCodeLocation,
  type SourceMap,
} from '../../source_mappers/source_map';
import { type LanguageAdaptor } from '../../language_adaptors';
import {
  sourceNodeFirstInstrStartAddr,
  type SourceCFGNode,
} from '../../cfg/source_cfg';

export abstract class WasmitoBackendVM implements WasmRuntimeAPI {
  private _channel: Channel;
  protected abstract logger: winston.Logger;
  private _platform: Platform;
  protected abstract readonly ErrorClass: new (errorMsg: string) => Error;

  protected readonly onNewEventHook: EventInspectHook;
  private onNewEventHookAdded: boolean;
  private _breakpointPolicy: BreakpointPolicy;
  private readonly _funcsProxied: Map<WASMFunction, AroundFunctionRequest>;

  public readonly hooksStore: Map<number, HookOnWasmAddrRequest[]>;

  constructor(platform: Platform, communicationChannel: Channel) {
    this._platform = platform;
    this._channel = communicationChannel;
    this.onNewEventHook = new EventInspectHook();
    this.onNewEventHookAdded = false;
    this.hooksStore = new Map();
    this._breakpointPolicy = new BreakpointDefaultPolicy(this);
    this._funcsProxied = new Map();
  }

  get platform(): Platform {
    if (this._platform === undefined) {
      throw new this.ErrorClass(`No Platform has been set yet`);
    }
    return this._platform;
  }

  set platform(p: Platform) {
    this._platform = p;
  }

  get deviceIdentity(): DeviceIdentity {
    return this.platform.config.deviceIdentity;
  }

  abstract close(timeout?: number): Promise<boolean>;

  async connect(timeout?: number): Promise<boolean> {
    const opened = await this.channel.open(timeout);
    if (opened) {
      this.logger.info('connected');
    } else {
      this.logger.error('failed to connect');
    }
    return opened;
  }

  public async disconnect(): Promise<boolean> {
    const closed = await this.channel.close();
    if (closed) {
      this.logger.info('disconnected');
    } else {
      this.logger.error('failed to disconnect');
    }
    return closed;
  }

  get channel(): Channel {
    return this._channel;
  }

  set channel(newChannel: Channel) {
    // TODO: figure out whether to update config
    this._channel = newChannel;
  }

  get languageAdaptor(): LanguageAdaptor {
    return this.platform.languageAdaptor;
  }

  get sourceMap(): SourceMap {
    return this.platform.sourceMap;
  }

  get breakpoints(): Breakpoint[] {
    return this.breakpointPolicy().breakpoints;
  }

  /*
   *
   * WARDUINO API implementation
   */

  breakpointPolicy(): BreakpointPolicy {
    return this._breakpointPolicy;
  }

  changeBreakpointPolicy(newPolicy: BreakpointPolicy): void {
    this._breakpointPolicy.deactivate();
    newPolicy.activate(this._breakpointPolicy.breakpoints);
    this._breakpointPolicy = newPolicy;
  }

  functionsProxied(): Set<WASMFunction> {
    return new Set(this._funcsProxied.keys());
  }

  public async subscribeOnNewEvent(
    cb: (ev: WASM.Event) => void,
    timeout?: number,
  ): Promise<boolean> {
    if (!this.onNewEventHookAdded) {
      this.onNewEventHookAdded = await this.addHookOnNewEvent(
        this.onNewEventHook,
        timeout,
      );
    }

    if (this.onNewEventHookAdded) {
      this.onNewEventHook.subscribe(cb);
    }
    return this.onNewEventHookAdded;
  }

  public async run(timeout?: number): Promise<boolean> {
    const request = new RunRequest();
    this.logger.debug('Sending RunRequest');
    await this.sendRequest(request, timeout);
    this.logger.info('Running');
    return true;
  }

  public async pause(timeout?: number): Promise<void> {
    const request = new PauseRequest();
    this.logger.debug('Sending PauseRequest');
    await this.sendRequest(request, timeout);
    this.logger.info('Paused');
  }

  public async step(timeout?: number): Promise<void> {
    const request = new StepRequest();
    this.logger.debug('Sending StepRequest');
    await this.sendRequest(request, timeout);
    this.logger.info('Stepped');
  }

  async inspect(
    neededState: StateRequest,
    timeout?: number,
  ): Promise<WasmState> {
    return this.sendRequest(neededState, timeout);
  }

  async snapshot(timeout?: number): Promise<WasmState> {
    const request = new StateRequest();
    request.includeAll();
    this.logger.debug(`requesting a snapshot`);
    return this.sendRequest(request, timeout);
  }

  abstract uploadSourceCode(
    sourceCodeCompilerArgs: any,
    timeout?: number,
  ): Promise<boolean>;

  public async sendRequest<T>(
    request: APIRequest<T>,
    timeout?: number,
  ): Promise<T> {
    const command = new Command(this.channel, request, timeout);
    return command.execute();
  }

  public async sendCommand<T>(command: Command<T>): Promise<T> {
    return command.execute();
  }

  public async loadWasmState(
    wasmState: WasmState,
    timeout?: number,
  ): Promise<void> {
    const builder = new LoadStateRequestBuilder(wasmState);
    const requests = Promise.all(
      builder.buildRequests().map(async (req) => this.sendRequest(req)),
    );
    if (timeout !== undefined) {
      await timeoutPromise(requests, timeout);
    } else {
      await requests;
    }
  }

  async resolveEvent(timeout?: number): Promise<void> {
    const request = new ResolveEventRequest();
    await this.sendRequest(request, timeout);
  }

  public async proxify(timeout?: number): Promise<void> {
    const request = new ProxifyRequest();
    this.logger.debug('Sending ProxifyRequest');
    await this.sendRequest(request, timeout);
    this.logger.info('VM in proxy mode');
  }

  async addBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number | undefined,
  ): Promise<boolean> {
    return await this.breakpointPolicy().addBreakpoint(breakpoint, timeout);
  }

  async removeBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number | undefined,
  ): Promise<boolean> {
    return await this.breakpointPolicy().removeBreakpoint(breakpoint, timeout);
  }

  async proxyCall(
    funcid: number,
    args: WASM.Value[],
    timeout?: number | undefined,
  ): Promise<ProxyCallResponse> {
    const request = new ProxyCallRequest(funcid, args);
    return await this.sendRequest(request, timeout);
  }

  async registerFuncForProxyCall(
    funcToProxy: WASMFunction,
    timeout?: number,
  ): Promise<boolean> {
    if (this._funcsProxied.has(funcToProxy)) {
      this.logger.info(
        `Function ${funcToProxy.name} is alread registered for proxy calls`,
      );
      return true;
    }

    const req = new AroundFunctionRequest(funcToProxy.id).addHook(
      new ProxyCallHook(funcToProxy.id),
    );
    const reply = await this.sendRequest(req, timeout);
    if (reply.responseType === ResponseType.SuccessResponse) {
      this.logger.info(
        `Function ${funcToProxy.name} is registered for proxy calls`,
      );
      this._funcsProxied.set(funcToProxy, req);
      return true;
    } else if (reply.responseType === ResponseType.ErrorResponse) {
      this.logger.error(
        `Function ${funcToProxy.name} could not be registered for proxy calls error_code=${reply.error_code})`,
      );
      return false;
    } else {
      this.logger.error(
        `Received unexpected aroundRequest ack message of type ${reply.responseType} for function ${funcToProxy.name}`,
      );
      return false;
    }
  }

  async unregisterFuncForProxyCall(
    funcToProxy: WASMFunction,
    timeout?: number,
  ): Promise<boolean> {
    const req = this._funcsProxied.get(funcToProxy);
    if (req === undefined) {
      this.logger.info(
        `Function ${funcToProxy.name} is has never been registered for proxy calls`,
      );
      return false;
    }

    const reply = await this.sendRequest(req.removeRequest(), timeout);
    if (reply.responseType === ResponseType.SuccessResponse) {
      this.logger.info(
        `Function ${funcToProxy.name} was successfully unregistered for proxy calls`,
      );
      this._funcsProxied.delete(funcToProxy);
      return true;
    } else if (reply.responseType === ResponseType.ErrorResponse) {
      this.logger.error(
        `Function ${funcToProxy.name} could not be unregistered for proxy calls error_code=${reply.error_code})`,
      );
      return false;
    } else {
      this.logger.error(
        `Received unexpected aroundRequest ack message of type ${reply.responseType} for function ${funcToProxy.name}`,
      );
      return false;
    }
  }

  async addHookBeforeSrcNode(
    node: SourceCFGNode,
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    const addr = sourceNodeFirstInstrStartAddr(node);
    const req = new HookOnWasmAddrRequest(addr).addHook(hook);
    req.before();
    const response = await this.sendRequest(req, timeout);
    return isSuccessfulMessage(response);
  }

  async addHookBefore(
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    return this.addHook(
      sourceCodeLocation,
      hook,
      HookOnWasmAddrMoment.HookBefore,
      timeout,
    );
  }

  async addHookAfter(
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    return this.addHook(
      sourceCodeLocation,
      hook,
      HookOnWasmAddrMoment.HookAfter,
      timeout,
    );
  }

  private async addHook(
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    moment: HookOnWasmAddrMoment,
    timeout?: number,
  ): Promise<boolean> {
    const sm = this.sourceMap;
    let addr = -1;
    let mappings: SourceCodeLocation[] = [];
    if (sourceCodeLocation.address > 0) {
      mappings = sm.getOriginalPositionFor(sourceCodeLocation.address);
    }
    if (mappings.length === 0) {
      mappings = sm.getOriginalPositionFor(sourceCodeLocation.address);
    }

    sm.generatedPositionFor(sourceCodeLocation);
    if (mappings.length !== 0) {
      addr = mappings[0].address;
    } else {
      // Case where SourceMap might be empty
      // happens when target language is wasm
      // we can still addHook only if the loc has
      // a valid wasm addr
      const instr = sm.wasm.getInstruction(sourceCodeLocation.address);
      if (instr === undefined) {
        throw new this.ErrorClass(
          `Cannot set hook upon inexistent wasm address derived from source location ${sourceCodeLocationToString(sourceCodeLocation)}`,
        );
      }
      addr = instr.startAddress;
    }
    const req = new HookOnWasmAddrRequest(addr, moment).addHook(hook);
    const response = await this.sendRequest(req, timeout);
    const s = isSuccessfulMessage(response);
    if (s) {
      const requests = this.hooksStore.get(addr) ?? [];
      requests.push(req);
      this.hooksStore.set(addr, requests);
    }
    return s;
  }

  async addHookOnNewEvent(
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    const request = new HookOnEventRequest().onNewEvent(hook);
    const response = await this.sendRequest(request, timeout);
    return isSuccessfullHookOnEventResponse(response);
  }

  async addHookOnEventHandling(hook: Hook, timeout?: number): Promise<boolean> {
    const request = new HookOnEventRequest().onEventHandling(hook);
    const response = await this.sendRequest(request, timeout);
    return isSuccessfullHookOnEventResponse(response);
  }

  async addHookOnError(hook: Hook, timeout?: number): Promise<boolean> {
    const request = new HookOnError().onError(hook);
    const response = await this.sendRequest(request, timeout);
    return isSuccessfullHookOnErrorResponse(response);
  }
}
