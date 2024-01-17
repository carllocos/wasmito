import { spawn, type ChildProcess } from 'child_process';
import { WARDuinoVM } from './warduino_vm';
import {
  type VMConfigArgs,
  type VMConfiguration,
} from '../../device/vm_config';
import { ClientSideSocket } from '../../communication/client_socket';
import {
  type DeviceConfigArgs,
  type DeviceConfig,
} from '../../device/device_config';
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

function createPlatformBuilderConfig(
  deviceConfigArgs: DeviceConfigArgs,
  vmConfigArgs: VMConfigArgs,
): PlatformBuilderConfig {
  return new PlatformBuilderConfig(
    Platform.DevVM,
    BoardBaudRate.NONE,
    {
      boardName: '',
      fqbn: '',
    },
    deviceConfigArgs,
    vmConfigArgs,
  );
}

export class WARDuinoDevVM extends WARDuinoVM {
  protected logger: winston.Logger;
  protected process?: ChildProcess;
  protected ErrorClass = WARDuinoDevVMError;

  constructor(
    deviceConfigArgs: DeviceConfigArgs,
    vmConfigArgs: VMConfigArgs,
    buildOutputDir?: string,
  ) {
    super(
      createPlatformBuilderConfig(deviceConfigArgs, vmConfigArgs),
      new NoChannel(),
      buildOutputDir,
    );

    if (this.vmConfig.hasToolPort()) {
      this.channel = new ClientSideSocket(
        this.vmConfig.toolPort,
        this.vmConfig.toolHostIP,
        this.deviceConfig.fullname,
      );
    }
    this.logger = createLogger(this.deviceConfig.fullname);
  }

  get vmConfig(): VMConfiguration {
    return this.platformConfig.deviceConfig.vmConfig;
  }

  get deviceConfig(): DeviceConfig {
    return this.platformConfig.deviceConfig;
  }

  async close(timeout?: number): Promise<boolean> {
    this.logger.info('closing VM');
    const closedChannel = await this.channel.close(timeout);
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
      throw new this.ErrorClass(`SourceMap is undefined`);
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
    const childProcess = spawn(spawnCommand, processArgs);
    childProcess.stdout.on('data', (data) => {
      this.logger.debug(`(stdout) ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
      this.logger.error(`(stderr) ${data}`);
    });

    const connected = await this.connect(maxWaitTime);
    if (!connected) {
      this.logger.error(
        `Failed to connect to local DevelopmentVM at port ${this.vmConfig.toolPort}`,
      );
      this.logger.error('Killing local DevelopmentVM process');
      childProcess.kill();
      throw new this.ErrorClass('timed out connecting to DevVM process');
    }

    this.process = childProcess;

    return childProcess;
  }

  protected buildProcessArguments(
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

  protected async assertExistanceToolPort(): Promise<void> {
    if (this.vmConfig.hasToolPort()) {
      if (await isPortInUse(this.vmConfig.toolPort)) {
        throw new this.ErrorClass(
          `Cannot spawn a DevelopmentVM on Port ${this.vmConfig.toolPort} as it is already in use`,
        );
      }
    } else {
      this.logger.info('No toolPort provided so will open a free port');
      const openPort = await getFreePort();
      if (openPort === undefined) {
        throw new this.ErrorClass(
          'Cannot spawn a DevelopmentVM as no free port was found',
        );
      }
      this.logger.info(
        `No toolPort provided so will start using port ${openPort}`,
      );
      this.vmConfig.toolPort = openPort;
    }
  }
}
