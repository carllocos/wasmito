import * as fs from 'fs';
import { type Logger } from 'winston';
import { createLogger } from '../../src/logger/logger';
import { BoardBaudRate } from '../../src/util/serial_port';
import {
  DeploymentMode,
  type DeviceConfigArgs,
} from '../../src/device/device_config';
import { type VMConfigArgs } from '../../src/device/vm_config';
import {
  type BoardFQBN,
  Platform,
  PlatformBuilderConfig,
} from '../../src/builder/platform_config';
import { type APIRequest } from '../../src/warduino/api/request_interface';
import { type Command } from '../../src/communication/command';
import {
  type WASMFunction,
  type SourceCodeLocation,
  type SourceMap,
} from '../../src/source_mappers/source_map';
import { StateRequest } from '../../src/warduino/requests/inspect_request';
import { type WasmState } from '../../src/state/wasm';
import { type Hook } from '../../src/hooks/hook';
import { WARDuinoVM } from '../../src/warduino/vm/warduino_vm';
import { MockChannel } from './mock_channel';

function createPlatformBuilderConfig(): PlatformBuilderConfig {
  const deviceConfigArgs: DeviceConfigArgs = {
    name: 'mock',
    deploymentMode: DeploymentMode.DevVM,
  };

  const vmConfigArgs: VMConfigArgs = {
    program: 'no program',
    disableStrictModuleLoad: true,
  };
  const fqbn: BoardFQBN = {
    boardName: 'mock',
    fqbn: 'mock',
  };

  return new PlatformBuilderConfig(
    Platform.DevVM,
    BoardBaudRate.NONE,
    fqbn,
    deviceConfigArgs,
    vmConfigArgs,
  );
}

export class MockVM extends WARDuinoVM {
  protected logger: Logger = createLogger('MockVM');
  protected ErrorClass: new (errorMsg: string) => Error = Error;
  private readonly states: WasmState[];
  private readonly _mockChannel: MockChannel;

  constructor(outputDir?: string) {
    super(createPlatformBuilderConfig(), new MockChannel(), outputDir);
    this._mockChannel = this.channel as MockChannel;
    this.states = [];
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
    sourceCodeLocation: SourceCodeLocation,
    stateOnBreakpoint?: StateRequest | undefined,
    stateHandler?: ((state: WasmState) => void) | undefined,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async removeBreakpoint(
    sourceCodeLocation: SourceCodeLocation,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async proxify(timeout?: number | undefined): Promise<void> {
    throw new Error(`not implementend`);
  }

  async uploadSourceCode(
    sourceCodePath: string,
    timeout?: number | undefined,
  ): Promise<boolean> {
    const exitCode = await this.platform.compile(sourceCodePath);
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
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }

  async addHookAfter(
    sourceCodeLocation: SourceCodeLocation,
    hook: Hook,
    timeout?: number | undefined,
  ): Promise<boolean> {
    throw new Error(`not implementend`);
  }
}
