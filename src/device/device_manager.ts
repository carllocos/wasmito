import type winston from 'winston';
import { createLogger } from '../logger/logger';
import { WasmitoDevVM } from '../runtimes/wasmito_vm/dev_vm';
import { MCUWasmitoVM } from '../runtimes/wasmito_vm/mcu_vm';
import { type ChildProcess } from 'child_process';
import { type WasmitoBackendVM } from '../runtimes';
import {
  InputMode,
  type OutOfPlaceSetupConfig,
  OutOfPlaceVM,
  OutOfThingsMonitor,
  OutputMode,
} from '../runtimes/wasmito_vm/outofplace_vm';
import { SerialConnection } from '../communication/serial';
import { ClientSideSocket } from '../communication/client_socket';
import { LanguageAdaptor } from '../language_adaptors';
import { DevVMPlatform } from '../platforms/dev_vm_platform';
import { createDevPlatform } from '../platforms/platformbuilder_factory';
import { ArduinoBoardBuilder } from '../platforms/arduino_platform';

export class DeviceManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceManagerError';
    Error.captureStackTrace(this, DeviceManagerError);
  }
}

export class DeviceManager {
  logger: winston.Logger;
  localprocesses: Array<[WasmitoDevVM, ChildProcess?]>;

  private readonly onNewDeviceListeners: Array<(dev: WasmitoBackendVM) => void>;
  constructor() {
    this.logger = createLogger('DeviceManager');
    this.localprocesses = [];
    this.onNewDeviceListeners = [];
  }

  subscribeOnNewDevice(cb: (dev: WasmitoBackendVM) => void): void {
    this.onNewDeviceListeners.push(cb);
  }

  private notifyListeners(vm: WasmitoBackendVM): void {
    this.onNewDeviceListeners.forEach((cb) => {
      cb(vm);
    });
  }

  async connectToExistingDevVM(
    languageAdaptor: LanguageAdaptor,
    platform: DevVMPlatform,
    maxWaitTime: number,
  ): Promise<WasmitoDevVM> {
    const tp = platform.config.vmConfig.toolPort;
    const th = platform.config.vmConfig.toolHostIP;
    const n = platform.config.deviceIdentity.fullname;
    const channel = new ClientSideSocket(tp, th, n);
    const devVM = new WasmitoDevVM(platform, channel);
    devVM.languageAdaptor = languageAdaptor;

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
    langAdaptor: LanguageAdaptor,
    platform?: DevVMPlatform,
    maxWaitTime?: number,
  ): Promise<WasmitoDevVM> {
    // todo fix this adaptor
    if (platform === undefined) {
      platform = await createDevPlatform({});
    }
    const devVM = new WasmitoDevVM(platform);
    const childProcess = await devVM.spawn(langAdaptor, maxWaitTime);
    this.registerListenersOnVMProcess(childProcess);
    this.localprocesses.push([devVM, childProcess]);
    this.notifyListeners(devVM);
    return devVM;
  }

  async spawnOutOfPlaceVM(
    targetVM: WasmitoBackendVM,
    targetInputMode: InputMode,
    maxWaitTime?: number,
    buildOutputDir?: string,
  ): Promise<OutOfPlaceVM> {
    const setupConfig: OutOfPlaceSetupConfig = {
      targetInputMode,
      pauseTarget: true,
      localVMStartOutputMode: OutputMode.RedirectAllOutput,
      maxWaitTime,
      buildOutputDir,
    };
    const vm = await OutOfPlaceVM.createVM(targetVM, setupConfig);
    const vmProcess = await vm.spawnWithConfig(setupConfig);
    this.registerListenersOnVMProcess(vmProcess);
    this.localprocesses.push([vm, vmProcess]);
    this.notifyListeners(vm);
    return vm;
  }

  createOutOfThingsMonitor(targetVM: WasmitoBackendVM): OutOfThingsMonitor {
    const monitor = new OutOfThingsMonitor(targetVM);
    monitor.onSpawn((vm: WasmitoDevVM, childProcess: ChildProcess) => {
      this.registerListenersOnVMProcess(childProcess);
      this.localprocesses.push([vm, childProcess]);
      this.notifyListeners(vm);
    });
    return monitor;
  }

  async setupAlreadySpawnedVMForOutOfPlaceVM(
    toolPort: number,
    targetVM: WasmitoBackendVM,
    serverPortForProxyCalls?: number,
    maxWaitTime?: number,
    buildOutputDir?: string,
  ): Promise<OutOfPlaceVM> {
    const setupConfig: OutOfPlaceSetupConfig = {
      targetInputMode: InputMode.CopyInput,
      pauseTarget: true,
      localVMStartOutputMode: OutputMode.RedirectAllOutput,
      maxWaitTime,
      buildOutputDir,
      portToUseForSharedChannel: serverPortForProxyCalls,
    };
    const vm = await OutOfPlaceVM.createVM(targetVM, setupConfig);
    // TODO configured for edward parametrize more of config
    await vm.useAlreadySpawnedVM(toolPort, setupConfig);
    this.localprocesses.push([vm, undefined]);
    this.notifyListeners(vm);
    return vm;
  }

  async connectToExistingMCUVM(
    languageAdaptor: LanguageAdaptor,
    platform: ArduinoBoardBuilder,
  ): Promise<MCUWasmitoVM> {
    const sp = platform.config.vmConfig.serialPort;
    const br = platform.config.vmConfig.baudrate;
    const channel = new SerialConnection(sp, br);
    const vm = new MCUWasmitoVM(platform, channel);
    vm.languageAdaptor = languageAdaptor;
    const connected = await vm.connect();
    if (!connected) {
      throw Error('Could not connect to external MCU VM');
    }

    this.notifyListeners(vm);
    return vm;
  }

  async spawnHardwareVM(
    languageAdaptor: LanguageAdaptor,
    platform: ArduinoBoardBuilder,
  ): Promise<MCUWasmitoVM> {
    const vm = new MCUWasmitoVM(platform);
    const uploaded = await vm.uploadSourceCode(languageAdaptor);
    if (!uploaded) {
      throw new Error(
        `failed to upload source code ${platform.config.deviceIdentity.name}`,
      );
    }

    this.notifyListeners(vm);
    return vm;
  }

  async closeVM(vm: WasmitoBackendVM, timeout?: number): Promise<boolean> {
    return await vm.close(timeout);
  }

  private registerListenersOnVMProcess(vmProcess: ChildProcess): void {
    vmProcess.on('close', (code) => {
      const vm = this.localprocesses.find(
        ([, p]: [WasmitoDevVM, ChildProcess?]) => {
          return p === vmProcess;
        },
      )?.[0];

      const config = vm?.deviceIdentity;
      this.logger.info(
        `Spawned process ${config?.name} exit with code ${code}`,
      );
      this.logger.debug(`Removing process ${config?.name} from local list`);

      this.localprocesses = this.localprocesses.filter(
        ([, p]: [WasmitoDevVM, ChildProcess?]) => {
          return p !== vmProcess;
        },
      );
    });
  }
}
