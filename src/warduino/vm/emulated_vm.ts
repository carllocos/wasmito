import { type ChildProcess } from 'child_process';
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

    const wasm = await this.platform.getWasm();
    const updateRequest = new UpdateWasmModuleRequest(wasm);
    await this.sendRequest(updateRequest, timeout);
    return true;
  }
}
