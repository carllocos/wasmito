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
    process?: ChildProcess,
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
    this.process = process;
    this.deviceConfig = deviceConfig;
    this.logger = createLogger(deviceConfig.name);
  }

  public isProcess(p: ChildProcess): boolean {
    return this.process === p;
  }

  public async connectToProcess(timeout: number): Promise<boolean> {
    return await this.channel.open(timeout);
  }
}
