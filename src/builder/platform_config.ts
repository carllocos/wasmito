import { type VMConfigArgs } from '../device';
import {
  DeploymentMode,
  DeviceConfig,
  type DeviceConfigArgs,
} from '../device/device_config';
import { BoardBaudRate } from '../util/serial_port';

export interface BoardFQBN {
  boardName: string;
  fqbn: string;
}

export enum PlatformTarget {
  Arduino,
  DevVM,
}

export class PlatformBuilderConfig {
  public readonly target: PlatformTarget;
  public readonly deviceConfig: DeviceConfig;
  public readonly baudrate: BoardBaudRate;
  public readonly fqbn: BoardFQBN;

  constructor(
    target: PlatformTarget,
    baudrate: BoardBaudRate,
    fqbn: BoardFQBN,
    deviceConfigArgs: DeviceConfigArgs,
    vmConfigArgs: VMConfigArgs,
  ) {
    this.target = target;
    this.baudrate = baudrate;
    this.fqbn = fqbn;
    if (
      deviceConfigArgs.name === undefined ||
      (typeof deviceConfigArgs.name === 'string' &&
        deviceConfigArgs.name === '')
    ) {
      deviceConfigArgs.name = this.createVMName(
        deviceConfigArgs.deploymentMode,
      );
    }

    if (baudrate !== BoardBaudRate.NONE) {
      if (vmConfigArgs.baudrate === undefined) {
        vmConfigArgs.baudrate = baudrate;
      } else if (vmConfigArgs.baudrate !== baudrate) {
        throw new Error(
          `Baudrate of platformconfig ${baudrate} does not match baudrate of VM config ${vmConfigArgs.baudrate}`,
        );
      }
    }
    this.deviceConfig = new DeviceConfig(deviceConfigArgs, vmConfigArgs);
  }

  configuredForSerial(): boolean {
    return (
      this.target !== PlatformTarget.DevVM &&
      this.deviceConfig.vmConfig.hasSerialPort() &&
      this.baudrate !== BoardBaudRate.NONE
    );
  }

  configuredForNetwork(): boolean {
    return false;
  }

  private createVMName(mode: DeploymentMode): string {
    switch (mode) {
      case DeploymentMode.DevVM:
        return 'DevVM ';
      case DeploymentMode.ProxyVM:
        return 'OutOfPlaceVM';
      case DeploymentMode.MCUVM:
        return 'Board TODO';
      default:
        return 'VM unsupported mode';
    }
  }
}
