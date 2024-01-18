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
import { type SourceMap } from '../../source_mappers/source_map';
import { ClientSideSocket, ShareChannel } from '../../communication/index';
import { getPath2WARDuinoSDKVMBinary } from '../../project_config';
import { type WasmState } from '../../state/wasm';

export class OutOfPlaceVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutOfPlaceVMError';
    Error.captureStackTrace(this, OutOfPlaceVMError);
  }
}

export enum OutOfPlaceMode {
  IndepentOOP,
  RedirectOOP,
}

export class OutOfPlaceVM extends WARDuinoDevVM {
  protected ErrorClass = OutOfPlaceVMError;
  private readonly outOfPlaceMode: OutOfPlaceMode;
  public readonly targetVM: WARDuinoVM;

  private readonly shareableChannel: ShareChannel;

  constructor(
    outOfPlaceMode: OutOfPlaceMode,
    targetVM: WARDuinoVM,
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
    this.shareableChannel = new ShareChannel(this.targetVM.channel);
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

  public async spawn(maxWaitTime?: number): Promise<ChildProcess> {
    if (this.outOfPlaceMode === OutOfPlaceMode.RedirectOOP) {
      await this.targetVM.pause(maxWaitTime);
    }
    const snapshot = await this.targetVM.snapshot(maxWaitTime);
    // TODO register event hooks

    if (!(await this.shareableChannel.startServer())) {
      throw new this.ErrorClass(
        'Could not start the socket server for the ShareableChannel',
      );
    }

    this.targetVM.channel = this.shareableChannel;
    const spawnedProcess = await this.spawnProcess();

    let success = true;
    switch (this.outOfPlaceMode) {
      case OutOfPlaceMode.IndepentOOP:
        success = await this.setupForIndependentOOP(maxWaitTime);
        break;
      case OutOfPlaceMode.RedirectOOP:
        success = await this.setupForRedirectOOP(snapshot, maxWaitTime);
        break;
    }

    if (!success) {
      const errMsg = `Failed to setup the VM in the requested out-of-place mode ${this.outOfPlaceMode}`;
      this.logger.error(errMsg);
      spawnedProcess.kill();
      this.logger.error('Killing the local VM process');
      throw new this.ErrorClass(errMsg);
    }
    this.process = spawnedProcess;
    return spawnedProcess;
  }

  async setupForRedirectOOP(
    snapshot: WasmState,
    maxWaitTime?: number,
  ): Promise<boolean> {
    this.logger.debug(
      `sending the retrieved snapshot to the local Out-of-place VM`,
    );
    await this.loadWasmState(snapshot, maxWaitTime);
    const sm = this.getSourceMap() as SourceMap;
    const primitiveFuncs = sm.getEnvironmentFunctions();
    for (const func of primitiveFuncs) {
      const succ = await this.registerFuncForProxyCall(func, maxWaitTime);
      if (!succ) return succ;
    }
    return true;
  }

  async setupForIndependentOOP(maxWaitTime?: number): Promise<boolean> {
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

  private async spawnProcess(maxWaitTime?: number): Promise<ChildProcess> {
    await this.assertExistanceToolPort();
    this.channel = new ClientSideSocket(
      this.vmConfig.toolPort,
      this.vmConfig.toolHostIP,
      this.deviceConfig.fullname,
    );

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
    const processArgs = this.buildProcessArguments(
      sourceMap.wasmFilePath,
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
    if (!connected) {
      this.logger.error(
        `Failed to connect to local DevelopmentVM at port ${this.vmConfig.toolPort}`,
      );
      this.logger.error('Killing local DevelopmentVM process');
      spawnedProcess.kill();
      throw new this.ErrorClass('timed out connecting to DevVM process');
    }

    return spawnedProcess;
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
    case OutOfPlaceMode.IndepentOOP:
    case OutOfPlaceMode.RedirectOOP:
      modeExists = true;
      break;
    default:
      modeExists = false;
  }
  if (!modeExists) {
    throw new OutOfPlaceVMError(`given outOfPlace mode ${mode} does not exist`);
  }
}
