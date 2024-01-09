import { VMConfiguration, type VMConfigArgs } from './vm_config';
import type winston from 'winston';
import { createLogger } from '../logger/logger';
import {
  DeploymentMode,
  type DeviceConfigArgs,
  DeviceConfig,
} from './device_config';
import { WARDuinoDevVM } from '../warduino/vm/dev_vm';
import { MCUWARDuinoVM } from '../warduino/vm/mcu_vm';
import { type PlatformBuilderConfig } from '../builder/platform_config';
import { type ChildProcess } from 'child_process';
import { type WARDuinoVM } from '../warduino';
import { WARDuinoProxiedVM } from '../warduino/vm/proxy_vm';

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
    const devVM = new WARDuinoDevVM(deviceConfig, vmConfig, buildOutputDir);

    const connected = await devVM.connect(maxWaitTime);
    if (!connected) {
      this.logger.info(
        `Failed to connect to local DevelopmentVM at port ${vmConfig.toolPort}`,
      );
      throw new DeviceManagerError('timed out connecting to DevVM process');
    }
    this.localprocesses.push(devVM);
    return devVM;
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
      DeploymentMode.DevVM,
      vmConfigArgs,
      maxWaitTime,
      buildOutputDir,
    );
  }

  async spawnProxiedVM(
    vmToProxy: WARDuinoVM,
    maxWaitTime?: number,
    buildOutputDir?: string,
  ): Promise<WARDuinoProxiedVM> {
    // TODO register hooks for events
    // TODO use shareable channel
    const vm = new WARDuinoProxiedVM(vmToProxy, buildOutputDir);
    const childProcess = await vm.spawn(maxWaitTime);
    this.registerListenersOnVMProcess(childProcess);
    this.localprocesses.push(vm);
    return vm;
  }

  async spawnHardwareVM(
    platformConfig: PlatformBuilderConfig,
    buildOutputDir?: string,
  ): Promise<MCUWARDuinoVM> {
    return new MCUWARDuinoVM(platformConfig, buildOutputDir);
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
    mode: DeploymentMode,
    spawnArgs: VMConfigArgs,
    maxWaitTime?: number,
    buildOutputDir?: string,
  ): Promise<WARDuinoDevVM> {
    const vmConfig = new VMConfiguration(spawnArgs);
    const deviceConfigArgs: DeviceConfigArgs = {
      name: vmHumanReadableName,
      id: vmID,
      deploymentMode: mode,
    };
    const deviceConfig = new DeviceConfig(deviceConfigArgs, vmConfig);
    const devVM = new WARDuinoDevVM(deviceConfig, vmConfig, buildOutputDir);
    const childProcess = await devVM.spawn(maxWaitTime);
    this.registerListenersOnVMProcess(childProcess);
    this.localprocesses.push(devVM);
    return devVM;
  }
}
