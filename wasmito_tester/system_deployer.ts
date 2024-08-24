import type winston from 'winston';
import { type BoardFQBN } from '../src/platforms/platform_config';
import { DeviceManager } from '../src/device/device_manager';
import {
  LogLevel,
  createLogger,
  getLogLevelFromString,
} from '../src/logger/logger';
import { timeoutPromise } from '../src/util/promise_util';
import { type WARDuinoVM } from '../src/warduino/vm/warduino_vm';
import {
  type DeviceSetup,
  Target,
  type DevicesLab,
  type TestScenario,
  type TestProgram,
} from './shared_interfaces';
import {
  autoBuildArduinoPlatform,
  createDevPlatform,
} from '../src/platforms/platformbuilder_factory';

export class SystemDeployer {
  private readonly setup;
  private readonly _logger;
  private readonly usedSerialPorts: Set<string>;

  private readonly deviceManager: DeviceManager;

  private readonly vmMap: Map<string, WARDuinoVM>;

  public MAX_WAIT_TIME_DevVM_SPAWN: number;

  constructor(setup: DevicesLab) {
    this.setup = setup;
    this.vmMap = new Map();
    const loggerName = setup.logger?.name ?? 'SystemDeployer';
    let loggerLevel = LogLevel.LogInfo;
    if (setup.logger?.level !== undefined) {
      const level = getLogLevelFromString(setup.logger.level);
      if (level !== undefined) {
        loggerLevel = level;
      }
    }
    this._logger = createLogger(loggerName, loggerLevel);
    this.usedSerialPorts = new Set();
    this.deviceManager = new DeviceManager();
    this.assertUniqueID();
    this.MAX_WAIT_TIME_DevVM_SPAWN = 3000;
  }

  get logger(): winston.Logger {
    return this._logger;
  }

  devices(): DeviceSetup[] {
    return this.setup.devices;
  }

  device(id: string): DeviceSetup | undefined {
    return this.setup.devices.find((dev) => {
      return dev.id === id;
    });
  }

  hasVMDevice(id: string): boolean {
    return this.vmMap.has(id);
  }

  deviceVM(id: string): WARDuinoVM {
    const vm = this.vmMap.get(id);
    if (vm === undefined) {
      throw new Error(`VM for device with id ${id} does not exists`);
    }
    return vm;
  }

  async deployOnDevice(
    scenario: TestScenario,
    deviceID: string,
  ): Promise<void> {
    const device = this.setup.devices.find((d: DeviceSetup, idx: number) => {
      return d.id === deviceID;
    });
    if (device === undefined) {
      throw Error(`No device found in Laboratory with ID '${deviceID}'`);
    }

    if (this.hasVMDevice(deviceID)) {
      // const vm = this.deviceVM(deviceID);
      // const fn = getFileName(scenario.testProgram);
      console.log('Todo: reuse same device if poossible');
    } else {
      switch (device.target) {
        case Target.mcu:
          await this.deployMCU(scenario.testProgram, device);
          break;
        case Target.devExternal:
        case Target.dev: {
          const connectToExternalVM = device.target === Target.devExternal;
          await this.deployDev(
            scenario.testProgram,
            device,
            connectToExternalVM,
          );
          break;
        }
        default:
          this._logger.error(
            `unsupported target '${device.target}' was provided for device with ID ${deviceID}`,
          );
          break;
      }
    }
  }

  private async deployMCU(
    program: TestProgram,
    device: DeviceSetup,
  ): Promise<void> {
    let fqbn: BoardFQBN | undefined;
    if (device.fqbn !== undefined) {
      fqbn = {
        boardName: '',
        fqbn: device.fqbn,
      };
    }

    const platform = await autoBuildArduinoPlatform(
      {
        selectedLanguage: {
          targetLanguage: program.targetLanguage,
        },
        deviceIdentity: {
          name: device.name,
        },
        vmConfig: {
          serialPort: device.serialPort,
          baudrate: device.baudrate,
          fqbn,
        },
      },
      this.usedSerialPorts,
    );
    const vm = await this.deviceManager.spawnHardwareVM(
      platform,
      program.sourceCodeCompilationArgs,
    );
    this.usedSerialPorts.add(platform.config.vmConfig.serialPort);
    await this.applyPostDeployment(device, vm);
  }

  private async deployDev(
    testProgram: TestProgram,
    device: DeviceSetup,
    externalProcess: boolean,
  ): Promise<void> {
    if (externalProcess && device.toolPort === undefined) {
      throw Error(
        `Device with id ${device.id}: cannot connect to external VM without 'toolPort' field in DeviceSetup`,
      );
    }
    const platform = await createDevPlatform({
      selectedLanguage: {
        targetLanguage: testProgram.targetLanguage,
      },
      vmConfig: {
        toolPort: device.toolPort,
      },
    });

    const vm = externalProcess
      ? await this.deviceManager.connectToExistingDevVM(
          platform,
          {}, // TODO fix to use compilerArgs
          this.MAX_WAIT_TIME_DevVM_SPAWN,
        )
      : await this.deviceManager.spawnDevelopmentVM(
          platform,
          testProgram.sourceCodeCompilationArgs,
          this.MAX_WAIT_TIME_DevVM_SPAWN,
        );

    if (externalProcess) {
      const exitCode = await vm.platform.compileSourceCode(
        testProgram.sourceCodeCompilationArgs,
      );
      if (exitCode !== 0) {
        throw Error(
          `Could not compile program ${testProgram.sourceCodeCompilationArgs} exit code ${exitCode}`,
        );
      }
    }
    await this.applyPostDeployment(device, vm);
  }

  private assertUniqueID(): void {
    const usedIDs = new Set<string>();
    for (let i = 0; i < this.setup.devices.length; i++) {
      const device = this.setup.devices[i];
      device.id = device.id.trim();
      if (usedIDs.has(device.id)) {
        throw Error(
          `Device id during setup must be unique. ID ${device.id} already encountered `,
        );
      }
      usedIDs.add(device.id);
    }
  }

  private async applyPostDeployment(
    device: DeviceSetup,
    vm: WARDuinoVM,
  ): Promise<void> {
    const postSetup = device.postSetup;
    if (postSetup.actions !== undefined) {
      for (let i = 0; i < postSetup.actions.length; i++) {
        const action = postSetup.actions[i];
        let p = action.doAction(vm);
        if (action.timeout !== undefined) {
          p = timeoutPromise(p, action.timeout);
        }
        try {
          const result = await p;
          const succeeded = await action.checkActionSuccess(result);
          if (!succeeded) {
            const errMSg = `PostDeployment on Device ${device.id}: checkActionSuccess is false for action #${i}`;
            this.logger.error(errMSg);
            throw Error(errMSg);
          }
        } catch (e) {
          const errMsg = `#${i}`;
          this.logger.error(
            `PostDeployment on Device ${device.id}: failed on action ${errMsg}: `,
            e,
          );
          throw e;
        }
      }
    }
    this.vmMap.set(device.id, vm);
  }
}
