import * as fs from 'fs';
import { type Logger } from 'winston';
import { createLogger } from '../../src/logger/logger';
import { type APIRequest } from '../../src/warduino/api/request_interface';
import { type Command } from '../../src/communication/command';
import { StateRequest } from '../../src/warduino/requests/inspect_request';
import { type WasmState } from '../../src/webassembly/wasm';
import { type Hook } from '../../src/hooks/hook';
import { WARDuinoVM } from '../../src/warduino/vm/warduino_vm';
import { MockChannel } from './mock_channel';
import { type Breakpoint } from '../../src/debugger/breakpoint';
import { type WASMFunction } from '../../src/webassembly/wasm/wasm_function';
import { type Platform } from '../../src/platforms/platform';
import {
  type SourceCodeLocation2,
  type SourceMap,
} from '../../src/source_mappers/source_map';

export class MockVM extends WARDuinoVM {
  protected logger: Logger = createLogger('MockVM');
  protected ErrorClass: new (errorMsg: string) => Error = Error;
  private readonly states: WasmState[];
  private readonly _mockChannel: MockChannel;
  private readonly _mockAddHookOnNewEventResponse: boolean[];

  constructor(platform: Platform) {
    super(platform, new MockChannel());
    this._mockChannel = this.channel as MockChannel;
    this.states = [];
    this._mockAddHookOnNewEventResponse = [];
  }

  /*
   * Mock Specific methods
   */

  get mockChannel(): MockChannel {
    return this._mockChannel;
  }

  async mockSnapshot(filePath: string): Promise<void> {
    const stateRequest = new StateRequest();
    stateRequest.includeAll();
    const data: string = fs.readFileSync(filePath, 'utf8');
    const parsed: WasmState = stateRequest.parse(data);
    this.states.push(parsed);
  }

  mockResponseForAddHookOnNewEvent(response: boolean): void {
    this._mockAddHookOnNewEventResponse.push(response);
  }

  /*
   * VM methods needed for mocking
   */

  async connect(timeout?: number): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  public async disconnect(): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  public async sendRequest<T>(
    request: APIRequest<T>,
    timeout?: number,
  ): Promise<T> {
    throw new Error(`not implementend`);
  }

  public async sendCommand<T>(command: Command<T>): Promise<T> {
    return command.execute();
  }

  public getSourceMap(): SourceMap | undefined {
    return this.platform.getSourceMap();
  }

  async close(timeout?: number | undefined): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async run(timeout?: number | undefined): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async pause(timeout?: number | undefined): Promise<void> {
    this.logger.info('mock pause');
  }

  async step(timeout?: number | undefined): Promise<void> {
    throw new Error(`not implementend`);
  }

  async addBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async removeBreakpoint(
    breakpoint: Breakpoint,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async proxify(timeout?: number | undefined): Promise<void> {
    throw new Error(`not implementend`);
  }

  async uploadSourceCode(
    sourceCodeCompilerArgs: any,
    timeout?: number | undefined,
  ): Promise<boolean> {
    const exitCode = await this.platform.buildForPlatform(
      sourceCodeCompilerArgs,
      timeout,
    );
    if (exitCode !== 0) {
      return false;
    }
    const sourceMap = this.platform.getSourceMap();
    if (sourceMap === undefined) {
      throw new this.ErrorClass(`SourceMap is undefined`);
    }
    return true;
  }

  async inspect(
    neededState: StateRequest,
    timeout?: number | undefined,
  ): Promise<WasmState> {
    throw new Error(`not implementend`);
  }

  async snapshot(timeout?: number | undefined): Promise<WasmState> {
    const state = this.states.shift();
    if (state === undefined) throw new Error('no snapshot for mock');
    return state;
  }

  async loadWasmState(
    state: WasmState,
    timeout?: number | undefined,
  ): Promise<void> {
    throw new Error(`not implementend`);
  }

  async resolveEvent(timeout?: number | undefined): Promise<void> {
    throw new Error(`not implementend`);
  }

  async registerFuncForProxyCall(
    funcToProxy: WASMFunction,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async addHookBefore(
    sourceCodeLocation: SourceCodeLocation2,
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async addHookAfter(
    sourceCodeLocation: SourceCodeLocation2,
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async addHookOnNewEvent(
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    const response = this._mockAddHookOnNewEventResponse.shift();
    if (response === undefined) {
      throw new Error(`No mock response provided`);
    }
    return response;
  }
}
