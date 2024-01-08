import { spawn, type ChildProcess } from 'child_process';
import { WARDuinoVM } from './warduino_vm';
import { type VMConfiguration } from '../../device/vm_config';
import { ClientSideSocket } from '../../communication/client_socket';
import { type DeviceConfig } from '../../device/device_config';
import type winston from 'winston';
import { createLogger } from '../../logger/logger';
import { Platform, PlatformBuilderConfig } from '../../builder/platform_config';
import { UpdateWasmModuleRequest } from '../requests/update_module_request';
import { getPath2WARDuinoSDKVMBinary } from '../../project_config';
import { getFreePort, isPortInUse } from '../../util/socket_util';
import { NoChannel } from '../../communication/no_channel';
import { BoardBaudRate } from '../../util/serial_port';

export class WARDuinoDevVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WARDuinoDevVMError';
    Error.captureStackTrace(this, WARDuinoDevVMError);
  }
}

export class WARDuinoDevVM extends WARDuinoVM {
  protected logger: winston.Logger;
  private process?: ChildProcess;
  private readonly vmConfig: VMConfiguration;
  private readonly deviceConfig: DeviceConfig;

  constructor(
    deviceConfig: DeviceConfig,
    vmConfig: VMConfiguration,
    buildOutputDir?: string,
  ) {
    super(
      new PlatformBuilderConfig(
        Platform.Emulated,
        BoardBaudRate.NONE,
        {
          boardName: '',
          fqbn: '',
        },
        deviceConfig,
      ),
      vmConfig.hasToolPort()
        ? new ClientSideSocket(vmConfig.toolPort, vmConfig.toolHostIP)
        : new NoChannel(),
      buildOutputDir,
    );
    this.vmConfig = vmConfig;
    this.deviceConfig = deviceConfig;
    this.logger = createLogger(deviceConfig.name);
  }

  async close(): Promise<boolean> {
    this.logger.info('closing VM');
    const closedChannel = await this.channel.close();
    const closedProcess = this.process?.kill() ?? true;
    this.logger.debug(
      closedChannel
        ? 'VM channel successfully closed'
        : 'VM channel could not be closed',
    );
    this.logger.debug(
      closedProcess
        ? 'VM Process successfully killed'
        : 'VM process could not be killed',
    );
    return closedChannel && closedProcess;
  }

  public isProcess(p: ChildProcess): boolean {
    return this.process === p;
  }

  public async uploadSourceCode(
    sourceCodePath: string,
    timeout?: number,
  ): Promise<boolean> {
    const exitCode = await this.platform.compile(sourceCodePath);
    if (exitCode !== 0) {
      return false;
    }

    const sourceMap = this.platform.getSourceMap();
    if (sourceMap === undefined) {
      throw new WARDuinoDevVMError(`SourceMap is undefined`);
    }
    const wasm = await sourceMap.getWasm();
    const updateRequest = new UpdateWasmModuleRequest(wasm);
    await this.sendRequest(updateRequest, timeout);
    return true;
  }

  public async spawn(maxWaitTime?: number): Promise<ChildProcess> {
    await this.assertExistanceToolPort();

    this.channel = new ClientSideSocket(
      this.vmConfig.toolPort,
      this.vmConfig.toolHostIP,
    );

    const exitCode = await this.platform.compile(this.vmConfig.program);
    if (exitCode !== 0) {
      throw new WARDuinoDevVMError(
        `Could not start DevVM. Compilation exited with code: ${exitCode}`,
      );
    }
    const sourceMap = this.platform.getSourceMap();
    if (sourceMap === undefined) {
      throw new WARDuinoDevVMError(`Could not generate SourceMap`);
    }
    const processArgs = this.buildProcessArguments(
      sourceMap.wasmFilePath,
      this.vmConfig,
    );
    const spawnCommand = getPath2WARDuinoSDKVMBinary();
    if (spawnCommand === undefined) {
      throw new WARDuinoDevVMError(
        "Path to WARDuino SDK is not set. You can set it via env variable 'WARDUINO_SDK=PATH'",
      );
    }

    this.logger.info(
      `starting DevelopmentVM process ${spawnCommand} with arguments ${processArgs.join(
        ' ',
      )}`,
    );
    const childProcess = spawn(spawnCommand, processArgs);
    childProcess.stdout.on('data', (data) => {
      this.logger.debug(`${this.deviceConfig.name} (Spawned process): ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
      this.logger.error(`${this.deviceConfig.name} (Spawned process): ${data}`);
    });

    const connected = await this.connect(maxWaitTime);
    if (!connected) {
      this.logger.info(
        `Failed to connect to local DevelopmentVM at port ${this.vmConfig.toolPort}`,
      );
      this.logger.info('Killing local DevelopmentVM process');
      childProcess.kill();
      throw new WARDuinoDevVMError('timed out connecting to DevVM process');
    }

    this.process = childProcess;

    return childProcess;
  }

  private buildProcessArguments(
    programPath: string,
    args: VMConfiguration,
  ): string[] {
    const processArgs: string[] = [programPath];

    if (args.hasToolPort()) {
      processArgs.push('--socket');
      processArgs.push(args.toolPort.toString());
    }
    if (args.pauseOnStart) {
      processArgs.push('--paused');
    }
    if (args.disableStrictModuleLoad) {
      processArgs.push('--disable-strict-module-load');
    }
    return processArgs;
  }

  private async assertExistanceToolPort(): Promise<void> {
    if (this.vmConfig.hasToolPort()) {
      if (await isPortInUse(this.vmConfig.toolPort)) {
        throw new WARDuinoDevVMError(
          `Cannot spawn a DevelopmentVM on Port ${this.vmConfig.toolPort} as it is already in use`,
        );
      }
    } else {
      this.logger.info(
        'No toolPort provided so will open a random available one',
      );
      const openPort = await getFreePort();
      if (openPort === undefined) {
        throw new WARDuinoDevVMError(
          'Cannot spawn a DevelopmentVM as no free port was found',
        );
      }
      this.vmConfig.toolPort = openPort;
    }
  }
}
