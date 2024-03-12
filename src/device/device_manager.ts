// import { type VMConfigArgs } from './vm_config';
import type winston from 'winston';
import { createLogger } from '../logger/logger';
// import { DeploymentMode, type DeviceIdentity } from './device_config';
import { WARDuinoDevVM } from '../warduino/vm/dev_vm';
import { MCUWARDuinoVM } from '../warduino/vm/mcu_vm';
import { type ChildProcess } from 'child_process';
import { type WARDuinoVM } from '../warduino';
import {
  InputMode,
  type OutOfPlaceSetupConfig,
  OutOfPlaceVM,
  OutOfThingsMonitor,
  OutputMode,
} from '../warduino/vm/outofplace_vm';
// import { type ProgLangSelectionArgs } from '../source_mappers/compilers/prog_language_selection';
import { type DevVMPlatform, type ArduinoBoardBuilder } from '../builder';
import { NoChannel } from '../communication/no_channel';

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

  private readonly onNewDeviceListeners: Array<(dev: WARDuinoVM) => void>;
  constructor() {
    this.logger = createLogger('DeviceManager');
    this.localprocesses = [];
    this.onNewDeviceListeners = [];
  }

  subscribeOnNewDevice(cb: (dev: WARDuinoVM) => void): void {
    this.onNewDeviceListeners.push(cb);
  }

  private notifyListeners(vm: WARDuinoVM): void {
    this.onNewDeviceListeners.forEach((cb) => {
      cb(vm);
    });
  }

  // TODO remove deviceConfigArgs
  async connectToExistingDevVM(
    platform: DevVMPlatform,
    // selectedLanguage: ProgLangSelectionArgs,
    // deviceConfigArgs: DeviceIdentity,
    // toolPort: number,
    // program: string,
    maxWaitTime: number,
    // buildOutputDir?: string,
  ): Promise<WARDuinoDevVM> {
    // const vmConfigArgs: VMConfigArgs = {
    //   program,
    //   toolPort,
    // };
    // if (deviceConfigArgs.deploymentMode !== DeploymentMode.MCUVM) {
    //   vmConfigArgs.disableStrictModuleLoad = true;
    // }

    const devVM = new WARDuinoDevVM(platform);
    devVM.platform = platform;
    // selectedLanguage,
    // deviceConfigArgs,
    // vmConfigArgs,
    // buildOutputDir,

    // await devVM.platform.createCompiler();
    const connected = await devVM.connect(maxWaitTime);
    if (!connected) {
      this.logger.info(
        `Failed to connect to local DevelopmentVM at port ${platform.config.vmConfig.toolPort}`,
      );
      throw new DeviceManagerError('timed out connecting to DevVM process');
    }
    const noProcess = undefined;
    this.localprocesses.push([devVM, noProcess]);
    this.notifyListeners(devVM);
    return devVM;
  }

  async spawnDevelopmentVM(
    platform: DevVMPlatform,
    sourceCodeCompilationArgs: any,
    maxWaitTime?: number,
  ): Promise<WARDuinoDevVM> {
    const devVM = new WARDuinoDevVM(platform);
    const childProcess = await devVM.spawn(
      sourceCodeCompilationArgs,
      maxWaitTime,
    );
    this.registerListenersOnVMProcess(childProcess);
    this.localprocesses.push([devVM, childProcess]);
    this.notifyListeners(devVM);
    return devVM;
  }

  async spawnOutOfPlaceVM(
    targetVM: WARDuinoVM,
    targetInputMode: InputMode,
    maxWaitTime?: number,
    buildOutputDir?: string,
  ): Promise<OutOfPlaceVM> {
    const noServerPort = undefined;
    const vm = new OutOfPlaceVM(targetVM, noServerPort);
    // TODO configured for edward parametrize more of config
    const config: OutOfPlaceSetupConfig = {
      targetInputMode,
      pauseTarget: true,
      localVMStartOutputMode: OutputMode.RedirectAllOutput,
      maxWaitTime,
      buildOutputDir,
    };
    const childProcess = await vm.spawnWithConfig(config);
    this.registerListenersOnVMProcess(childProcess);
    this.localprocesses.push([vm, childProcess]);
    this.notifyListeners(vm);
    return vm;
  }

  createOutOfThingsMonitor(targetVM: WARDuinoVM): OutOfThingsMonitor {
    const monitor = new OutOfThingsMonitor(targetVM);
    monitor.onSpawn((vm: WARDuinoDevVM, childProcess: ChildProcess) => {
      this.registerListenersOnVMProcess(childProcess);
      this.localprocesses.push([vm, childProcess]);
      this.notifyListeners(vm);
    });
    return monitor;
  }

  async setupAlreadySpawnedVMForOutOfPlaceVM(
    toolPort: number,
    targetVM: WARDuinoVM,
    serverPortForProxyCalls?: number,
    maxWaitTime?: number,
    buildOutputDir?: string,
  ): Promise<OutOfPlaceVM> {
    const vm = new OutOfPlaceVM(targetVM, serverPortForProxyCalls);
    // TODO configured for edward parametrize more of config
    const config: OutOfPlaceSetupConfig = {
      targetInputMode: InputMode.CopyInput,
      pauseTarget: true,
      localVMStartOutputMode: OutputMode.RedirectAllOutput,
      maxWaitTime,
      buildOutputDir,
    };
    await vm.useAlreadySpawnedVM(toolPort, config);
    this.localprocesses.push([vm, undefined]);
    this.notifyListeners(vm);
    return vm;
  }

  async connectToExistingMCUVM(
    platform: ArduinoBoardBuilder,
  ): Promise<MCUWARDuinoVM> {
    const vm = new MCUWARDuinoVM(platform, new NoChannel());
    const connected = await vm.connect();
    if (!connected) {
      throw Error('Could not connect to external MCU VM');
    }
    const exitCode = await vm.platform.compileSourceCode(
      'TODO provide sourcePath',
    );
    if (exitCode !== 0) {
      throw Error('Could not compile source code');
    }

    this.notifyListeners(vm);
    return vm;
  }

  async spawnHardwareVM(
    platform: ArduinoBoardBuilder,
    sourceCodeCompilationArgs: any,
  ): Promise<MCUWARDuinoVM> {
    const vm = new MCUWARDuinoVM(platform);
    const uploaded = await vm.uploadSourceCode(sourceCodeCompilationArgs);
    if (!uploaded) {
      throw new Error(
        `failed to upload source code ${platform.config.deviceIdentity.name}`,
      );
    }

    this.notifyListeners(vm);
    return vm;
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

      const config = vm?.deviceIdentity;
      this.logger.info(
        `Spawned process ${config?.name} exit with code ${code}`,
      );
      this.logger.debug(`Removing process ${config?.name} from local list`);

      this.localprocesses = this.localprocesses.filter(
        ([, p]: [WARDuinoDevVM, ChildProcess?]) => {
          return p !== vmProcess;
        },
      );
    });
  }
}
