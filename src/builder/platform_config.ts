import { type DeviceConfig } from '../device/device_config';

export interface BoardFQBN {
  boardName: string;
  fqbn: string;
}

export enum Platform {
  Arduino,
}

export enum BoardBaudRate {
  BD_19200 = 19200,
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
}
