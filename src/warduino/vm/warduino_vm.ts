import type winston from 'winston';
import { type Channel } from '../../communication/channel_interface';
import { type WARDuinoAPI } from '../api/warduino_api';
import { RunRequest } from '../requests/run_request';
import { StepRequest } from '../requests/step_request';
import {
  isSuccessfulMessage,
  type APIRequest,
  ResponseType,
} from '../api/request_interface';
import { Command } from '../../communication/command';
import { type PlatformBuilderConfig } from '../../builder/platform_config';
import { type PlatformBuilder } from '../../builder/platformbuilder';
import { createPlatformBuilder } from '../../builder/platformbuilder_factory';
import { PauseRequest } from '../requests/pause_request';
import { ProxifyRequest } from '../requests/proxify_request';
import { type WASM, type WasmState } from '../../state/wasm';
import { StateRequest } from '../requests/inspect_request';
import { LoadStateRequestBuilder } from '../requests/load_state_request';
import { timeoutPromise } from '../../util/promise_util';
import { ResolveEventRequest } from '../requests/resolve_event_request';
import {
  type WASMFunction,
  type SourceCodeLocation,
  type SourceMap,
} from '../../source_mappers/source_map';
import {
  HookOnWasmAddrMoment,
  HookOnWasmAddrRequest,
  RemoveHookOnWasmAddrRequest,
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
import { type Breakpoint } from '../../debugger';
import { type Hook } from '../../hooks/hook';
import {
  HookOnError,
  isSuccessfullHookOnErrorResponse,
} from '../requests/hook_on_error';

// TODO Rename to Backend
export abstract class WARDuinoVM implements WARDuinoAPI {
  private _channel: Channel;
  protected abstract logger: winston.Logger;
  public readonly platformConfig: PlatformBuilderConfig;
  public readonly platform: PlatformBuilder;
  protected abstract readonly ErrorClass: new (errorMsg: string) => Error;

  private _breakpoints: Breakpoint[];

  constructor(
    platformConfig: PlatformBuilderConfig,
    communicationChannel: Channel,
    buildOutputDir?: string,
  ) {
    this.platformConfig = platformConfig;
    this._channel = communicationChannel;
    this.platform = createPlatformBuilder(platformConfig, buildOutputDir);
    this._breakpoints = [];
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

  get sourceMap(): SourceMap {
    const sm = this.getSourceMap();
    if (sm === undefined) {
      throw new this.ErrorClass('no Sourcemap set for VM');
    }
    return sm;
  }

  get breakpoints(): Breakpoint[] {
    return this._breakpoints;
  }

  /*
   *
   * WARDUINO API implementation
   */

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
    sourceCodePath: string,
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

  public getSourceMap(): SourceMap | undefined {
    return this.platform.getSourceMap();
  }

  async addBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number | undefined,
  ): Promise<boolean> {
    if (this.hasBreakpoint(breakpoint)) {
      this.logger.warn(`breakpoint ${breakpoint.toString()} was already set`);
      return true;
    }
    let successful = true;
    for (let i = 0; i < breakpoint.hooks.length; i++) {
      const hook = breakpoint.hooks[i];
      successful = await this.addHookBefore(
        breakpoint.sourceCodeLocation,
        hook,
        timeout,
      );
      if (!successful) {
        this.logger.error(`could not add breakpoint ${breakpoint.toString()}`);
        break;
      }
    }

    // if (stateOnBreakpoint === undefined) {
    //   if (stateHandler !== undefined) {
    //     throw new this.ErrorClass(
    //       'Expected `stateOnBreakpoint` to be set in order to handle it via callback `stateHandler`',
    //     );
    //   }
    //   return hookAdded;
    // }

    // if (stateHandler === undefined) {
    //   throw new this.ErrorClass(
    //     'Expected `stateHandler` callback argument as handler for `stateOnBreakpoint`',
    //   );
    // }
    // const inspectHook = new InspectStateHook(stateOnBreakpoint);
    // inspectHook.onSubscriptionData = stateHandler;
    // if (await this.addHookBefore(sourceCodeLocation, inspectHook, timeout)) {
    //   this.logger.info(`breakpoint added upon ${sourceCodeLocation.linenr}`);
    //   this._breakpoints.push(sourceCodeLocation);
    //   return true;
    // }
    if (successful) {
      this.logger.info(`breakpoint ${breakpoint.toString()} added`);
    } else {
      this.logger.error(`could not add breakpoint ${breakpoint.toString()}`);
    }
    return successful;
  }

  async removeBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number | undefined,
  ): Promise<boolean> {
    const sm = this.sourceMap;
    const mappings = sm.getMappingsFromSourceCodeLocation(
      breakpoint.sourceCodeLocation,
    );
    if (mappings.length === 0) {
      throw new this.ErrorClass(
        `Cannot breakpoint on an unexisting wasm address derived from breakpoint ${breakpoint.toString()}`,
      );
    }

    if (!this.hasBreakpoint(breakpoint)) {
      this.logger.info(
        `no breakpoint ${breakpoint.toString()} was previously set so nothing to remove`,
      );
      return false;
    }

    const addr = mappings[0].address;
    const request = new RemoveHookOnWasmAddrRequest(addr).before();

    const response = await this.sendRequest(request, timeout);
    const successful = isSuccessfulMessage(response);
    if (successful) {
      this._breakpoints = this._breakpoints.filter((b) => {
        return !breakpoint.equals(b);
      });
      this.logger.info(`breakpoint ${breakpoint.toString()} removed`);
    }

    return successful;
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
    const req = new AroundFunctionRequest(funcToProxy.id).addHook(
      new ProxyCallHook(funcToProxy.id),
    );
    const reply = await this.sendRequest(req, timeout);
    if (reply.responseType === ResponseType.SuccessResponse) {
      this.logger.info(
        `Function ${funcToProxy.name} is registered for proxy calls`,
      );
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
    const sm = this.getSourceMap();
    if (sm === undefined) {
      throw new this.ErrorClass(
        `There is no source Mapper set for current module`,
      );
    }
    const mappings = sm.getMappingsFromSourceCodeLocation(sourceCodeLocation);
    if (mappings.length === 0) {
      throw new this.ErrorClass(
        `Cannot set hook upon unexisting wasm address derived from source location ${sourceCodeLocation.linenr}`,
      );
    }
    const addr = mappings[0].address;
    const req = new HookOnWasmAddrRequest(addr).addHook(hook);
    switch (moment) {
      case HookOnWasmAddrMoment.HookBefore:
        req.before();
        break;
      case HookOnWasmAddrMoment.HookAfter:
        req.after();
        break;
      default:
        throw new this.ErrorClass(
          'Cannot set hook upon unexisting hook moment',
        );
    }
    const response = await this.sendRequest(req, timeout);
    return isSuccessfulMessage(response);
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

  private hasBreakpoint(bp: Breakpoint): boolean {
    const found = this._breakpoints.find((b) => {
      return bp.equals(b);
    });

    return found !== undefined;
  }
}
