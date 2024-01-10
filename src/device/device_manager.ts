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
import { OutOfPlaceMode, WARDuinoOutOfPlaceVM } from '../warduino/vm/proxy_vm';

export class DeviceManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceManagerError';
    Error.captureStackTrace(this, DeviceManagerError);
  }
}

export class DeviceManager {
  logger: winston.Logger;
  localprocesses: Array<[WARDuinoDevVM, ChildProcess?]>;

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
    const noProcess = undefined;
    this.localprocesses.push([devVM, noProcess]);
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
  ): Promise<WARDuinoOutOfPlaceVM> {
    const vm = new WARDuinoOutOfPlaceVM(
      OutOfPlaceMode.RedirectOOP,
      vmToProxy,
      buildOutputDir,
    );
    const childProcess = await vm.spawn(maxWaitTime);
    this.registerListenersOnVMProcess(childProcess);
    this.localprocesses.push([vm, childProcess]);
    return vm;
  }

  async spawnHardwareVM(
    platformConfig: PlatformBuilderConfig,
    buildOutputDir?: string,
  ): Promise<MCUWARDuinoVM> {
    return new MCUWARDuinoVM(platformConfig, buildOutputDir);
  }

  async closeVM(vm: WARDuinoDevVM, timeout?: number): Promise<boolean> {
    return await vm.close(timeout);
  }

  private registerListenersOnVMProcess(vmProcess: ChildProcess): void {
    vmProcess.on('close', (code) => {
      const vm = this.localprocesses.find(
        ([, p]: [WARDuinoDevVM, ChildProcess?]) => {
          return p === vmProcess;
        },
      )?.[0];

      const config = vm?.platformConfig.deviceConfig;
      this.logger.info(
        `Spawned process ${config?.name} (ID=${config?.id}) exit with code ${code}`,
      );
      this.logger.debug(
        `Removing process ${config?.name} (ID=${config?.id}) from local list`,
      );

      this.localprocesses = this.localprocesses.filter(
        ([, p]: [WARDuinoDevVM, ChildProcess?]) => {
          return p !== vmProcess;
        },
      );
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
    this.localprocesses.push([devVM, childProcess]);
    return devVM;
  }
}
