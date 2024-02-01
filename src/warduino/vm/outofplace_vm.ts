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
import { EventInspectHook } from '../../hooks/hook_event';
import { StateRequest } from '../requests/inspect_request';
import { UpdateCallbackMappingRequest } from '../requests/update_callbacks_request';
import { PushEventRequest } from '../requests/inject_event_request';

export class OutOfPlaceVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutOfPlaceVMError';
    Error.captureStackTrace(this, OutOfPlaceVMError);
  }
}

export enum OutOfPlaceMode {
  CopyInput,
  RedirectIO,
}

export class OutOfPlaceVM extends WARDuinoDevVM {
  protected ErrorClass = OutOfPlaceVMError;
  private readonly outOfPlaceMode: OutOfPlaceMode;
  public readonly targetVM: WARDuinoVM;

  private readonly shareableChannel: ShareChannel;

  public eventsToHandle: WASM.Event[];
  private readonly onNewEventHook: EventInspectHook;

  constructor(
    outOfPlaceMode: OutOfPlaceMode,
    targetVM: WARDuinoVM,
    serverPort?: number,
    buildOutputDir?: string,
  ) {
    super(
      createDeviceConfig(targetVM),
      createVMConfig(targetVM),
      buildOutputDir,
    );

    assertvalidOutOfPlaceMode(outOfPlaceMode);

    this.outOfPlaceMode = outOfPlaceMode;
    this.targetVM = targetVM;
    this.shareableChannel = new ShareChannel(this.targetVM.channel, serverPort);
    this.eventsToHandle = [];
    this.onNewEventHook = new EventInspectHook();
  }

  private async updateCallbackMapping(): Promise<void> {
    const req = new StateRequest().includeCallbackMappings();
    const state = await this.targetVM.inspect(req);

    const updateReq = new UpdateCallbackMappingRequest(state.callbackMappings);
    if (!(await this.sendRequest(updateReq))) {
      throw new this.ErrorClass('failed to update callback mappings');
    }
  }

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
    const handled = await this.sendRequest(injectEventRequest);
    if (!handled) {
      throw new this.ErrorClass('Could not handle event');
    }
    return true;
  }

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

  public async setupForExistingVM(
    toolPort: number,
    maxWaitTime?: number,
  ): Promise<void> {
    const snapshot = await this.setupTargetVM();
    this.vmConfig.toolPort = toolPort;
    this.createClientSideSocket();
    await this.compileSourceCode();
    this.logger.debug('Connecting to external VM...');
    const connected = await this.connect(maxWaitTime);
    if (!connected) {
      this.logger.error(
        `Failed to connect to local DevelopmentVM at port ${this.vmConfig.toolPort}`,
      );
      throw new this.ErrorClass('timed out connecting to DevVM process');
    }
    await this.setupLocalVM(snapshot, maxWaitTime);
  }

  public async spawn(maxWaitTime?: number): Promise<ChildProcess> {
    const snapshot = await this.setupTargetVM(maxWaitTime);
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

    const connected = await this.connect(maxWaitTime);
    if (connected) {
      const success = await this.setupLocalVM(snapshot, maxWaitTime);
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

  async setupForRedirectEvents(
    snapshot: WasmState,
    maxWaitTime?: number,
  ): Promise<boolean> {
    this.logger.debug(
      `sending the retrieved snapshot to the local Out-of-place VM`,
    );
    await this.loadWasmState(snapshot, maxWaitTime);
    const sm = this.sourceMap;
    const primitiveFuncs = sm.getEnvironmentFunctions();
    for (const func of primitiveFuncs) {
      const succ = await this.registerFuncForProxyCall(func, maxWaitTime);
      if (!succ) return succ;
    }
    return true;
  }

  async setupForCopyEvents(maxWaitTime?: number): Promise<boolean> {
    throw new Error('Method not implemented.');
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

  public subscribeOnNewEvent(cb: (ev: WASM.Event) => void): void {
    this.onNewEventHook.subscribe(cb);
  }

  private onNewEvent(ev: WASM.Event): void {
    this.eventsToHandle.push(ev);
  }

  private async registerAndAssertOnNewEventHooks(
    maxWaitTime?: number,
  ): Promise<void> {
    this.onNewEventHook.subscribe(this.onNewEvent.bind(this));
    const addedOnNewEventHook = await this.targetVM.addHookOnNewEvent(
      this.onNewEventHook,
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
    const exitCode = await this.platform.compile(this.vmConfig.program);
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

  private async setupTargetVM(maxWaitTime?: number): Promise<WasmState> {
    if (this.outOfPlaceMode === OutOfPlaceMode.RedirectIO) {
      await this.targetVM.pause(maxWaitTime);
    }

    await this.registerAndAssertOnNewEventHooks(maxWaitTime);

    const snapshot = await this.requestFirstSnapshot(maxWaitTime);
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
    maxWaitTime?: number,
  ): Promise<boolean> {
    let success = true;
    switch (this.outOfPlaceMode) {
      case OutOfPlaceMode.CopyInput:
        success = await this.setupForCopyEvents(maxWaitTime);
        break;
      case OutOfPlaceMode.RedirectIO:
        success = await this.setupForRedirectEvents(snapshot, maxWaitTime);
        break;
    }

    if (!success) {
      this.logger.error(
        `Failed to setup the VM in the requested out-of-place mode ${this.outOfPlaceMode}`,
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
}

// Helper functions
function createDeviceConfig(vmToProxy: WARDuinoVM): DeviceConfigArgs {
  const targetConfig = vmToProxy.platformConfig.deviceConfig;
  const name = `${targetConfig.name} (Proxied)`;
  return {
    name,
    deploymentMode: DeploymentMode.ProxyVM,
  };
}

function createVMConfig(vmToProxy: WARDuinoVM): VMConfigArgs {
  return {
    program: vmToProxy.platformConfig.deviceConfig.vmConfig.program,
    pauseOnStart: true,
    disableStrictModuleLoad: true,
  };
}

function assertvalidOutOfPlaceMode(mode: OutOfPlaceMode): void {
  let modeExists = false;
  switch (mode) {
    case OutOfPlaceMode.CopyInput:
    case OutOfPlaceMode.RedirectIO:
      modeExists = true;
      break;
    default:
      modeExists = false;
  }
  if (!modeExists) {
    throw new OutOfPlaceVMError(`given outOfPlace mode ${mode} does not exist`);
  }
}
