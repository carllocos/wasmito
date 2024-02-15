import type winston from 'winston';
import {
  type BoardFQBN,
  Platform,
  PlatformBuilderConfig,
} from '../../builder/platform_config';
import { listAllFQBN, listAvailableBoards } from '../../builder/util_platform';
import {
  DeploymentMode,
  type DeviceConfigArgs,
} from '../../device/device_config';
import { DeviceManager } from '../../device/device_manager';
import { type VMConfigArgs } from '../../device/vm_config';
import {
  LogLevel,
  createLogger,
  getLogLevelFromString,
} from '../../logger/logger';
import { timeoutPromise } from '../../util/promise_util';
import { BoardBaudRate } from '../../util/serial_port';
import { type WARDuinoVM } from '../../warduino/vm/warduino_vm';
import {
  type DeviceSetup,
  Target,
  type DevicesLab,
  type TestScenario,
} from './shared_interfaces';
import { getFileName } from '../../util/file_util';

export class SystemDeployer {
  private readonly setup;
  private readonly _logger;
  private readonly usedSerialPorts: Set<string>;

  private readonly deviceManager: DeviceManager;

  private readonly vmMap: Map<string, WARDuinoVM>;

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
    let i = -1;
    const device = this.setup.devices.find((d: DeviceSetup, idx: number) => {
      if (d.id === deviceID) {
        i = idx;
      }
      return d.id === deviceID;
    });
    if (device === undefined) {
      throw Error(`No device found in Laboratory with ID '${deviceID}'`);
    }

    if (this.hasVMDevice(deviceID)) {
      const vm = this.deviceVM(deviceID);
      const fn = getFileName(scenario.testProgram);
      if (vm.sourceMap.sourceCodeFileName === fn) {
        console.log('TODO reboot');
      } else {
        console.log('TODO: update source code');
      }
    } else {
      switch (device.target) {
        case Target.mcu:
          await this.deployMCU(scenario.testProgram, device, i);
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

  async deploy(program: string, ignoreDeviceIDs?: string[]): Promise<void> {
    for (let i = 0; i < this.setup.devices.length; i++) {
      const device = this.setup.devices[i];
      if (ignoreDeviceIDs !== undefined) {
        const found = ignoreDeviceIDs.find((idToIngore) => {
          return idToIngore === device.id;
        });
        if (found !== undefined) {
          this.logger.info(
            `Deployment cancelled for device with id ${device.id}`,
          );
          continue;
        }
      }

      switch (device.target) {
        case Target.mcu:
          await this.deployMCU(program, device, i);
          break;
        case Target.devExternal:
        case Target.dev: {
          const connectToExternalVM = device.target === Target.devExternal;
          await this.deployDev(program, device, connectToExternalVM);
          break;
        }
        default:
          this._logger.error(
            `unsupported target '${device.target}' was provided for device at index ${i}`,
          );
          break;
      }
    }
  }

  private async deployMCU(
    program: string,
    device: DeviceSetup,
    indexInSetup: number,
  ): Promise<void> {
    const config = await this.automaticBuildOfPlatformConfig(
      program,
      device,
      indexInSetup,
    );
    this.usedSerialPorts.add(config.deviceConfig.vmConfig.serialPort);

    const vm = await this.deviceManager.spawnHardwareVM(config);
    await this.applyPostDeployment(device, vm);
  }

  private async deployDev(
    program: string,
    device: DeviceSetup,
    externalProcess: boolean,
  ): Promise<void> {
    const vmConfigArgs: VMConfigArgs = {
      program,
      disableStrictModuleLoad: true,
    };
    let vm: WARDuinoVM | undefined;
    if (externalProcess) {
      const deviceConfig: DeviceConfigArgs = {
        deploymentMode: DeploymentMode.DevVM,
      };
      if (device.toolPort === undefined) {
        throw Error(
          `Device with id ${device.id}: cannot connect to external VM without 'toolPort' field in DeviceSetup`,
        );
      }
      vm = await this.deviceManager.connectToExistingDevVM(
        deviceConfig,
        device.toolPort,
        program,
        3000,
      );
      const exitCode = await vm.platform.compile(program);
      if (exitCode !== 0) {
        throw Error(
          `Could not compile program ${program} exit code ${exitCode}`,
        );
      }
    } else {
      vm = await this.deviceManager.spawnDevelopmentVM(vmConfigArgs);
    }
    await this.applyPostDeployment(device, vm);
  }

  // TODO move to toolkit
  private async automaticBuildOfPlatformConfig(
    program: string,
    device: DeviceSetup,
    idx: number,
  ): Promise<PlatformBuilderConfig> {
    const serialPort: string = device.serialPort ?? '';
    if (serialPort === '') {
      this._logger.info(
        'No serial port set so searching for a serial port to use',
      );
      const boards = await listAvailableBoards();
      let boardIdx = 0;
      while (boardIdx < boards.length) {
        const portCandidate = boards[0];
        if (this.usedSerialPorts.has(portCandidate)) {
          boardIdx++;
        } else {
          device.serialPort = portCandidate;
          this.usedSerialPorts.add(portCandidate);
          break;
        }
      }
      if (boards.length === 0 || boardIdx >= boards.length) {
        let errMsg = '';
        if (boards.length === 0) {
          errMsg = 'no serialPort provided nor a connected board detected';
        } else {
          errMsg =
            'No free serial port detected. All available serial ports already in use';
        }
        this._logger.error(errMsg);
        throw new Error(errMsg);
      }
    }
    if (device.baudrate === undefined) {
      this._logger.info(
        `No baudrate set using default ${BoardBaudRate.BD_115200}`,
      );
      device.baudrate = BoardBaudRate.BD_115200;
    }

    if (device.fqbn === undefined) {
      this._logger.error(`No FQBN provided for device at position ${idx}`);
      throw new Error(`No FQBN provided for device at position ${idx}`);
    }

    const fqbns = await listAllFQBN();
    const targetBoard = fqbns.find((board) => {
      return board.fqbn === device.fqbn;
    });
    if (targetBoard === undefined) {
      const errMsg = `No board found with fqbn ${device.fqbn}`;
      this._logger.error(errMsg);
      throw new Error(errMsg);
    }
    device.fqbn = targetBoard.fqbn;
    if (targetBoard.boardName !== '') {
      device.name = targetBoard.boardName;
    }

    const boardFQBN: BoardFQBN = {
      boardName: targetBoard.boardName,
      fqbn: targetBoard.fqbn,
    };

    const deviceConfig: DeviceConfigArgs = {
      deploymentMode: DeploymentMode.MCUVM,
    };
    const vmConfig: VMConfigArgs = {
      program,
      disableStrictModuleLoad: true,
      serialPort: device.serialPort,
      baudrate: device.baudrate,
    };
    return new PlatformBuilderConfig(
      Platform.Arduino,
      device.baudrate,
      boardFQBN,
      deviceConfig,
      vmConfig,
    );
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
