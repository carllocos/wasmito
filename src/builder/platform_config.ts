import { type DeviceConfig } from '../device/device_config';
import { BoardBaudRate } from '../util/serial_port';

export interface BoardFQBN {
  boardName: string;
  fqbn: string;
}

export enum Platform {
  Arduino,
  Emulated,
}

export class PlatformBuilderConfig {
  public readonly platform;
  public readonly deviceConfig;
  public readonly baudrate: BoardBaudRate;
  public readonly fqbn: BoardFQBN;

  constructor(
    platform: Platform,
    baudrate: BoardBaudRate,
    fqbn: BoardFQBN,
    deviceConfig: DeviceConfig,
  ) {
    this.platform = platform;
    this.baudrate = baudrate;
    this.fqbn = fqbn;
    this.deviceConfig = deviceConfig;
  }

  configuredForSerial(): boolean {
    return (
      this.platform !== Platform.Emulated &&
      isSerialPort(this.deviceConfig.port) &&
      this.baudrate !== BoardBaudRate.NONE
    );
  }

  configuredForNetwork(): boolean {
    return false;
  }
}
