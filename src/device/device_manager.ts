import { VMConfiguration, type VMConfigArgs } from './vm_config';
import type winston from 'winston';
import { createLogger } from '../logger/logger';
import {
  DeviceMode,
  type DeviceConfigArgs,
  DeviceConfig,
} from './device_config';
import { type Channel } from '../communication/channel_interface';
import { WARDuinoDevVM } from '../warduino/vm/dev_vm';
import { MCUWARDuinoVM } from '../warduino/vm/mcu_vm';
import { type PlatformBuilderConfig } from '../builder/platform_config';
import { SerialConnection } from '../communication/serial';
import { ClientSideSocket } from '../communication/client_socket';
import { type ChildProcess } from 'child_process';

export class DeviceManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceManagerError';
    Error.captureStackTrace(this, DeviceManagerError);
  }
}

export class DeviceManager {
  logger: winston.Logger;
  localprocesses: WARDuinoDevVM[];

  constructor() {
    this.logger = createLogger('DeviceManager');
    this.localprocesses = [];
  }

  async connectToExistingDevVM(
    deviceConfigArgs: DeviceConfigArgs,
    toolPort: number,
    program: string,
    maxWaitTime: number,
    buildOutputDir?: string,
  ): Promise<WARDuinoDevVM> {
    const vmConfig = new VMConfiguration({
      program,
      toolPort,
    });
    const deviceConfig = new DeviceConfig(deviceConfigArgs, vmConfig);
    const emulatedDevice = new WARDuinoDevVM(
      deviceConfig,
      vmConfig,
      buildOutputDir,
    );

    const connected = await emulatedDevice.connect(maxWaitTime);
    if (!connected) {
      this.logger.info(
        `Failed to connect to local DevelopmentVM at port ${vmConfig.toolPort}`,
      );
      throw new DeviceManagerError('timed out connecting to DevVM process');
    }
    this.localprocesses.push(emulatedDevice);
    return emulatedDevice;
  }

  async spawnDevelopmentVM(
    vmName: string,
    vmID: string,
    vmConfigArgs: VMConfigArgs,
    maxWaitTime: number,
    buildOutputDir?: string,
  ): Promise<WARDuinoDevVM> {
    return this.spawnDevelopmentVMFromConfigs(
      vmName,
      vmID,
      DeviceMode.Emulate,
      vmConfigArgs,
      maxWaitTime,
      buildOutputDir,
    );
  }

  async spawnProxiedDevelopmentVM(
    vmName: string,
    vmID: string,
    vmConfigArgs: VMConfigArgs,
    maxWaitTime: number,
    buildOutputDir?: string,
  ): Promise<WARDuinoDevVM> {
    return this.spawnDevelopmentVMFromConfigs(
      vmName,
      vmID,
      DeviceMode.Proxy,
      vmConfigArgs,
      maxWaitTime,
      buildOutputDir,
    );
  }

  async spawnHardwareVM(
    platformConfig: PlatformBuilderConfig,
    buildOutputDir?: string,
  ): Promise<MCUWARDuinoVM> {
    let channel: Channel | undefined;
    if (platformConfig.configuredForSerial()) {
      channel = new SerialConnection(
        platformConfig.deviceConfig.vmConfig.serialPort,
        platformConfig.baudrate,
      );
    } else if (platformConfig.configuredForNetwork()) {
      channel = new ClientSideSocket(
        platformConfig.deviceConfig.vmConfig.toolPort,
        platformConfig.deviceConfig.vmConfig.toolHostIP,
      );
    } else {
      throw new DeviceManagerError(
        `DeviceConfiguration has not been configured to serial or network`,
      );
    }
    return new MCUWARDuinoVM(platformConfig, channel, buildOutputDir);
  }

  async closeVM(vm: WARDuinoDevVM): Promise<boolean> {
    return await vm.close();
  }

  private registerListenersOnVMProcess(vmProcess: ChildProcess): void {
    vmProcess.on('close', (code) => {
      this.logger.info(`Spawned process exit with code ${code}`);
      this.logger.debug('Removing process from local list');
      this.localprocesses = this.localprocesses.filter((e: WARDuinoDevVM) => {
        return !e.isProcess(vmProcess);
      });
    });
  }

  private async spawnDevelopmentVMFromConfigs(
    vmHumanReadableName: string,
    vmID: string,
    mode: DeviceMode,
    spawnArgs: VMConfigArgs,
    maxWaitTime: number,
    buildOutputDir?: string,
  ): Promise<WARDuinoDevVM> {
    const vmConfig = new VMConfiguration(spawnArgs);
    const deviceConfigArgs: DeviceConfigArgs = {
      name: vmHumanReadableName,
      id: vmID,
      mode,
    };
    const deviceConfig = new DeviceConfig(deviceConfigArgs, vmConfig);
    const emulatedDevice = new WARDuinoDevVM(
      deviceConfig,
      vmConfig,
      buildOutputDir,
    );
    const childProcess = await emulatedDevice.spawn(maxWaitTime);
    this.registerListenersOnVMProcess(childProcess);
    this.localprocesses.push(emulatedDevice);
    return emulatedDevice;
  }
}
