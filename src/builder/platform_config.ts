import { isSerialPort, type DeviceConfig } from '../device/device_config';

export interface BoardFQBN {
  boardName: string;
  fqbn: string;
}

export enum Platform {
  Arduino,
  Emulated,
}

export enum BoardBaudRate {
  NONE = 0,
  BD_9600 = 9600,
  BD_115200 = 115200,
}

export const SerialBaudrates: number[] = [19200];

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
