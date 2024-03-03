import { type WARDuinoVM } from './warduino_vm';
import {
  type VMConfigArgs,
  type VMConfiguration,
} from '../../device/vm_config';
import {
  type DeviceConfigArgs,
  DeploymentMode,
} from '../../device/device_config';
import { WARDuinoDevVM } from './dev_vm';
import { spawn, type ChildProcess } from 'child_process';
import { ClientSideSocket, ShareChannel } from '../../communication/index';
import { getPath2WARDuinoSDKVMBinary } from '../../project_config';
import { type WASM, type WasmState } from '../../state/wasm';
import { StateRequest } from '../requests/inspect_request';
import { UpdateCallbackMappingRequest } from '../requests/update_callbacks_request';
import { PushEventRequest } from '../requests/inject_event_request';
import {
  type BreakpointPolicy,
  SingleStopBreakpointPolicy,
} from '../../debugger/breakpoint_policies';
import { InspectStateHook } from '../../hooks/hook_inspect_state';
import { type Breakpoint } from '../../debugger/breakpoint';
import type winston from 'winston';
import { createLogger } from '../../logger/logger';

export class OutOfPlaceVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutOfPlaceVMError';
    Error.captureStackTrace(this, OutOfPlaceVMError);
  }
}

export enum InputMode {
  CopyInput,
  RedirectInput,
}

export enum OutputMode {
  NoRedirect,
  RedirectAllOutput,
}

export interface OutOfPlaceSetupConfig {
  targetInputMode: InputMode;
  pauseTarget: boolean;

  localVMStartOutputMode: OutputMode;
  localVMStartSnapshot?: WasmState;

  maxWaitTime?: number;
  portToUseForSharedChannel?: number;
  buildOutputDir?: string;
}

// TODO refactor to become just a regular class

export class OutOfPlaceVM extends WARDuinoDevVM {
  protected ErrorClass = OutOfPlaceVMError;
  public readonly targetVM: WARDuinoVM;

  private readonly shareableChannel: ShareChannel;

  public eventsToHandle: WASM.Event[];

  constructor(
    targetVM: WARDuinoVM,
    serverPort?: number,
    buildOutputDir?: string,
  ) {
    super(
      createDeviceConfig(targetVM),
      createVMConfig(targetVM),
      buildOutputDir,
    );

    this.targetVM = targetVM;
    this.shareableChannel = new ShareChannel(this.targetVM.channel, serverPort);
    this.eventsToHandle = [];
  }

  /*
   * API Overwrites
   */

  override async close(timeout?: number): Promise<boolean> {
    if (!(await super.close(timeout))) {
      return false;
    }
    if (!(await this.shareableChannel.closeServer(timeout))) {
      return false;
    }
    this.targetVM.channel = this.shareableChannel.channelToShare;
    return true;
  }

  public override async subscribeOnNewEvent(
    cb: (ev: WASM.Event) => void,
    timeout?: number,
  ): Promise<boolean> {
    return await this.targetVM.subscribeOnNewEvent(cb, timeout);
  }

  protected override buildProcessArguments(
    programPath: string,
    args: VMConfiguration,
  ): string[] {
    const processArgs: string[] = [programPath];

    processArgs.push('--socket');
    processArgs.push(args.toolPort.toString());
    processArgs.push('--paused');
    processArgs.push('--disable-strict-module-load');
    processArgs.push('--proxy');
    this.logger.debug(
      `using port of ShareableChannel ${this.shareableChannel.serverPort} to proxy the target VM`,
    );
    processArgs.push(this.shareableChannel.serverPort.toString());

    return processArgs;
  }

  /*
   * Out Of Place specific new Methods
   */

  async handleEvent(eventNr: number, timeout?: number): Promise<boolean> {
    if (eventNr < 0 || eventNr >= this.eventsToHandle.length) {
      return false;
    }
    await this.updateCallbackMapping();
    const ev = this.eventsToHandle[eventNr];
    this.eventsToHandle = [
      ...this.eventsToHandle.slice(0, eventNr),
      ...this.eventsToHandle.slice(eventNr + 1),
    ];
    const injectEventRequest = new PushEventRequest(ev.topic, ev.payload);
    const handled = await this.sendRequest(injectEventRequest, timeout);
    if (!handled) {
      throw new this.ErrorClass('Could not handle event');
    }
    return true;
  }

  public async useAlreadySpawnedVM(
    toolPort: number,
    config: OutOfPlaceSetupConfig,
  ): Promise<void> {
    assertValidOutOfPlaceSpawnArgs(config);

    const requestSnapshot = config.localVMStartSnapshot === undefined;
    const snapshot = await this.setupTargetVM(
      config.targetInputMode,
      config.pauseTarget,
      requestSnapshot,
      config.maxWaitTime,
    );
    if (snapshot === undefined) {
      throw new this.ErrorClass(
        'Failed to retrieve snapshot from target VM while setting up for OutOfPlace',
      );
    }
    this.vmConfig.toolPort = toolPort;
    this.createClientSideSocket();
    await this.compileSourceCode();
    this.logger.debug('Connecting to external VM...');
    const connected = await this.connect(config.maxWaitTime);
    if (!connected) {
      this.logger.error(
        `Failed to connect to local DevelopmentVM at port ${this.vmConfig.toolPort}`,
      );
      throw new this.ErrorClass('timed out connecting to DevVM process');
    }
    await this.setupLocalVM(
      snapshot,
      config.localVMStartOutputMode,
      config.maxWaitTime,
    );
  }

  public async spawn(maxWaitTime?: number): Promise<ChildProcess> {
    throw new this.ErrorClass(
      'Spawn is not supported for OutOfPlace use instead spawnWithConfig',
    );
  }

  // TODO for edward: still do to for events on the MCU
  // 1. remove events that are in the queue on MCU
  // 2. remove event from MCU queue on new event
  public async spawnWithConfig(
    config: OutOfPlaceSetupConfig,
  ): Promise<ChildProcess> {
    assertValidOutOfPlaceSpawnArgs(config);

    const requestSnapshot = config.localVMStartSnapshot === undefined;
    const snapshot =
      (await this.setupTargetVM(
        config.targetInputMode,
        config.pauseTarget,
        requestSnapshot,
        config.maxWaitTime,
      )) ?? config.localVMStartSnapshot;
    if (snapshot === undefined) {
      if (requestSnapshot) {
        throw new this.ErrorClass(
          'Failed to retrieve snapshot from target VM while setting up for OutOfPlace',
        );
      } else {
        throw new this.ErrorClass(
          'Cannot setup a VM for OutOfPlace whitout a first snapshot. Either provide one via arg ol the request failed to retrieve the first snapshot',
        );
      }
    }

    await this.assertExistanceToolPort();
    this.createClientSideSocket();
    await this.compileSourceCode();

    const processArgs = this.buildProcessArguments(
      this.sourceMap.wasmFilePath,
      this.vmConfig,
    );
    const spawnCommand = getPath2WARDuinoSDKVMBinary();
    this.logger.info(
      `starting DevelopmentVM process ${spawnCommand} ${processArgs.join(' ')}`,
    );

    const spawnedProcess = spawn(spawnCommand, processArgs);
    spawnedProcess.stdout.on('data', (data) => {
      this.logger.debug(`(stdout) ${data}`);
    });

    spawnedProcess.stderr.on('data', (data) => {
      this.logger.error(`(stderr) ${data}`);
    });

    const connected = await this.connect(config.maxWaitTime);
    if (connected) {
      const success = await this.setupLocalVM(
        snapshot,
        config.localVMStartOutputMode,
        config.maxWaitTime,
      );
      if (!success) {
        spawnedProcess.kill();
        this.logger.error('Killing the local VM process');
      }
    } else {
      this.logger.error(
        `Failed to connect to local DevelopmentVM at port ${this.vmConfig.toolPort}`,
      );
      throw new this.ErrorClass('timed out connecting to DevVM process');
    }
    this.process = spawnedProcess;
    return spawnedProcess;
  }

  async registerAllPrimitivesForProxyCall(
    maxWaitTime?: number,
  ): Promise<boolean> {
    const sm = this.sourceMap;
    const primitiveFuncs = sm.getEnvironmentFunctions();
    for (const func of primitiveFuncs) {
      const succ = await this.registerFuncForProxyCall(func, maxWaitTime);
      if (!succ) return succ;
    }
    return true;
  }

  private onNewEvent(ev: WASM.Event): void {
    this.eventsToHandle.push(ev);
  }

  private async updateHooksOfTheTargetInput(
    inputMode: InputMode,
    maxWaitTime?: number,
  ): Promise<void> {
    if (inputMode === InputMode.RedirectInput) {
      this.logger.error(
        'TODO: set up the target VM to redirect input (e.g., events) for now fallback to CopyInput',
      );
    }

    const addedOnNewEventHook = await this.targetVM.subscribeOnNewEvent(
      this.onNewEvent.bind(this),
      maxWaitTime,
    );
    if (!addedOnNewEventHook) {
      throw new this.ErrorClass(
        'Could not add the hook to listen on new Events on target VM',
      );
    }
  }

  private async requestFirstSnapshot(maxWaitTime?: number): Promise<WasmState> {
    const snapshot = await this.targetVM.snapshot(maxWaitTime);
    const evts = snapshot.events ?? [];
    evts.forEach((ev) => {
      this.eventsToHandle.push(ev);
    });

    snapshot.events = [];

    return snapshot;
  }

  private async compileSourceCode(): Promise<void> {
    const exitCode = await this.platform.compileSourceCode(
      this.vmConfig.program,
    );
    if (exitCode !== 0) {
      throw new this.ErrorClass(
        `Could not start DevVM. Compilation exited with code: ${exitCode}`,
      );
    }
    const sourceMap = this.platform.getSourceMap();
    if (sourceMap === undefined) {
      throw new this.ErrorClass(`Could not generate SourceMap`);
    }
  }

  private async setupTargetVM(
    targetInputMode: InputMode,
    pause: boolean,
    requestSnapshot: boolean,
    maxWaitTime?: number,
  ): Promise<WasmState | undefined> {
    if (pause) {
      await this.targetVM.pause(maxWaitTime);
    }

    await this.updateHooksOfTheTargetInput(targetInputMode, maxWaitTime);

    let snapshot: WasmState | undefined;
    if (requestSnapshot) {
      snapshot = await this.requestFirstSnapshot(maxWaitTime);
    }

    if (!(await this.shareableChannel.startServer())) {
      throw new this.ErrorClass(
        'Could not start the socket server for the ShareableChannel',
      );
    }
    this.targetVM.channel = this.shareableChannel;
    return snapshot;
  }

  private async setupLocalVM(
    snapshot: WasmState,
    outputMode: OutputMode,
    maxWaitTime?: number,
  ): Promise<boolean> {
    this.logger.debug(
      `sending the retrieved snapshot to the local Out-of-place VM`,
    );
    await this.loadWasmState(snapshot, maxWaitTime);

    let success = true;
    switch (outputMode) {
      case OutputMode.NoRedirect:
        break;
      case OutputMode.RedirectAllOutput:
        success = await this.registerAllPrimitivesForProxyCall(maxWaitTime);
        break;
    }

    if (!success) {
      this.logger.error(
        `Failed to setup the local VM to the requested output mode '${outputMode}'`,
      );
    }
    return success;
  }

  private createClientSideSocket(): void {
    this.channel = new ClientSideSocket(
      this.vmConfig.toolPort,
      this.vmConfig.toolHostIP,
      this.deviceConfig.fullname,
    );
  }

  private async updateCallbackMapping(): Promise<void> {
    const req = new StateRequest().includeCallbackMappings();
    const state = await this.targetVM.inspect(req);

    const updateReq = new UpdateCallbackMappingRequest(state.callbackMappings);
    if (!(await this.sendRequest(updateReq))) {
      throw new this.ErrorClass('failed to update callback mappings');
    }
  }
}

// Helper functions
function createDeviceConfig(vmToProxy: WARDuinoVM): DeviceConfigArgs {
  const targetConfig = vmToProxy.platformConfig.deviceConfig;
  const name = `${targetConfig.name} (Proxied)`;
  return {
    name,
    deploymentMode: DeploymentMode.MCUVM,
  };
}

function createVMConfig(vmToProxy: WARDuinoVM): VMConfigArgs {
  return {
    program: vmToProxy.platformConfig.deviceConfig.vmConfig.program,
    pauseOnStart: true,
    disableStrictModuleLoad: true,
  };
}

function assertValidOutOfPlaceSpawnArgs(
  args: any,
): args is OutOfPlaceSetupConfig {
  if (typeof args !== 'object') {
    throw new OutOfPlaceVMError('Spawn args are expected to be an object');
  }

  assertvalidInputMode(args.targetInputMode);
  assertvalidOutpuMode(args.localVMStartOutputMode);

  if (args.pauseTarget === undefined || typeof args.pauseTarget !== 'boolean') {
    throw new OutOfPlaceVMError(
      'pauseTarget is mandatory and expected to be a boolean',
    );
  }

  const s: undefined | WasmState = args.localVMStartSnapshot;
  if (s !== undefined) {
    if (!s.isSnapshot()) {
      throw new OutOfPlaceVMError('The given WasmState is not a full snapshot');
    }
  }

  if (args.maxWaitTime !== undefined && typeof args.maxWaitTime !== 'number') {
    throw new OutOfPlaceVMError('maxWaitTime expected to be a number');
  }

  if (
    args.portToUseForSharedChannel !== undefined &&
    typeof args.portToUseForSharedChannel !== 'number'
  ) {
    throw new OutOfPlaceVMError(
      'portToUseForSharedChannel expected to be a number',
    );
  }

  if (
    args.buildOutputDir !== undefined &&
    typeof args.buildOutputDir !== 'string'
  ) {
    throw new OutOfPlaceVMError('buildOutputDir expected to be a string');
  }

  return args;
}

function assertvalidInputMode(mode: InputMode): void {
  let modeExists = false;
  switch (mode) {
    case InputMode.CopyInput:
    case InputMode.RedirectInput:
      modeExists = true;
      break;
  }
  if (!modeExists) {
    throw new OutOfPlaceVMError(`given inputmode ${mode} does not exist`);
  }
}

function assertvalidOutpuMode(mode: OutputMode): void {
  let modeExists = false;
  switch (mode) {
    case OutputMode.NoRedirect:
    case OutputMode.RedirectAllOutput:
      modeExists = true;
      break;
  }
  if (!modeExists) {
    throw new OutOfPlaceVMError(`given outputmode ${mode} does not exist`);
  }
}

export class OutOfThingsMonitor {
  private readonly targetVM: WARDuinoVM;
  private readonly _snapshots: WasmState[];
  private readonly _bpPolicy: BreakpointPolicy;
  private readonly _snapshotHook: InspectStateHook;
  private onSpawnCb: ((vm: WARDuinoDevVM, p: ChildProcess) => void) | undefined;

  constructor(targetVM: WARDuinoVM) {
    this.targetVM = targetVM;
    this._snapshots = [];
    this._bpPolicy = new SingleStopBreakpointPolicy(targetVM);
    this._bpPolicy.onBreakpointAdd(this.storeSnapshot.bind(this));
    this._snapshotHook = new InspectStateHook(new StateRequest().includeAll());
    this.targetVM.changeBreakpointPolicy(this._bpPolicy);
    this.onSpawnCb = undefined;
  }

  async setup(): Promise<void> {
    this.targetVM.breakpoints.forEach((bp) => {
      bp.subscribe((state: WasmState) => {
        if (state.isSnapshot()) {
          this._snapshots.push(state);
        }
      });
    });

    if (!(await this.targetVM.addHookOnError(this._snapshotHook))) {
      throw new Error(`Could not add hook On Error for snapshot`);
    }
  }

  getErrorSnapshots(): WasmState[] {
    return this._snapshots.filter((s) => {
      return s.exception !== undefined && s.exception !== '';
    });
  }

  onSpawn(cb: (vm: WARDuinoDevVM, p: ChildProcess) => void): void {
    this.onSpawnCb = cb;
  }

  async spawnDevVMOnSnapshot(
    snapshotIdx: number,
    maxWaitTime?: number,
    buildOutputDir?: string,
  ): Promise<OutOfPlaceVM> {
    if (snapshotIdx < 0 || snapshotIdx >= this._snapshots.length) {
      throw new Error(`Invalid snapshot index given ${snapshotIdx}`);
    }

    const sn = this._snapshots[snapshotIdx];
    const noServerPort = undefined;
    const vm = new OutOfPlaceVM(
      OutOfPlaceMode.CopyInput,
      this.targetVM,
      noServerPort,
      buildOutputDir,
    );
    const childProcess = await vm.spawnWithSnapshot(sn, maxWaitTime);
    if (this.onSpawnCb !== undefined) {
      this.onSpawnCb(vm, childProcess);
    }
    return vm;
  }

  private storeSnapshot(bp: Breakpoint): void {
    bp.subscribe((snapshot: WasmState) => {
      this._snapshots.push(snapshot);
    });
  }
}
