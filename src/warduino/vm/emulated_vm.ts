import { spawn, type ChildProcess } from 'child_process';
import { WARDuinoVM } from './warduino_vm';
import { type EmulatorSpawnArguments } from '../../device/emulator_config';
import { ClientSideSocket } from '../../communication/client_socket';
import { type DeviceConfig } from '../../device/device_config';
import type winston from 'winston';
import { createLogger } from '../../logger/logger';
import {
  BoardBaudRate,
  Platform,
  PlatformBuilderConfig,
} from '../../builder/platform_config';
import { UpdateWasmModuleRequest } from '../requests/update_module_request';
import { getPath2WARDuinoSDKEmulatorBinary } from '../../project_config';

export class EmulatedWARDuinoVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmulatedWARDuinoVMError';
    Error.captureStackTrace(this, EmulatedWARDuinoVMError);
  }
}

export class EmulatedWARDuinoVM extends WARDuinoVM {
  protected logger: winston.Logger;
  private readonly process?: ChildProcess;
  private readonly args: EmulatorSpawnArguments;
  private readonly deviceConfig: DeviceConfig;

  constructor(
    socketPort: number,
    deviceConfig: DeviceConfig,
    args: EmulatorSpawnArguments,
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
      new ClientSideSocket(socketPort, 'localhost'),
      buildOutputDir,
    );
    this.args = args;
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
      throw new EmulatedWARDuinoVMError(`SourceMap is undefined`);
    }
    const wasm = await sourceMap.getWasm();
    const updateRequest = new UpdateWasmModuleRequest(wasm);
    await this.sendRequest(updateRequest, timeout);
    return true;
  }

  public async spawn(): Promise<ChildProcess> {
    const exitCode = await this.platform.compile(this.deviceConfig.program);
    if (exitCode !== 0) {
      throw new EmulatedWARDuinoVMError(
        `Could not start emulator. Compilation exited with code: ${exitCode}`,
      );
    }
    const sourceMap = this.platform.getSourceMap();
    if (sourceMap === undefined) {
      throw new EmulatedWARDuinoVMError(`Could not generate SourceMap`);
    }
    const processArgs = this.buildProcessArguments(
      sourceMap.wasmFilePath,
      this.args,
    );
    this.logger.info(
      `starting emulator process with arguments ${processArgs.join(' ')}`,
    );
    const spawnCommand = getPath2WARDuinoSDKEmulatorBinary();
    if (spawnCommand === undefined) {
      throw new EmulatedWARDuinoVMError(
        "Path to WARDuino SDK is not set. You can set it via env variable 'WARDUINO_SDK=PATH'",
      );
    }

    this.logger.debug(
      'decide whether to move callbacks on data or on close to the EmulateDevice class',
    );

    const childProcess = spawn(spawnCommand, processArgs);
    childProcess.stdout.on('data', (data) => {
      this.logger.debug(`${this.deviceConfig.name} (Spawned process): ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
      this.logger.error(`${this.deviceConfig.name} (Spawned process): ${data}`);
    });

    return childProcess;
  }

  private buildProcessArguments(
    programPath: string,
    args: EmulatorSpawnArguments,
  ): string[] {
    const processArgs: string[] = [programPath];

    if (args.listenPort !== undefined) {
      processArgs.push('--socket');
      processArgs.push(args.listenPort.toString());
    }
    if (args.pauseOnStart) {
      processArgs.push('--paused');
    }
    if (
      args.disableStrictModuleLoad !== undefined &&
      args.disableStrictModuleLoad
    ) {
      processArgs.push('--disable-strict-module-load');
    }
    return processArgs;
  }
}
