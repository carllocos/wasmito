import { type DeviceIdentityArgs } from '../device/device_config';
import { type VMConfigArgs } from '../device/vm_config';
import { getGlobalLogger } from '../logger/logger';
import { type ProgLangSelectionArgs } from '../source_mappers/compilers/prog_language_selection';
import { BoardBaudRate } from '../util/serial_port';
import {
  type BoardFQBN,
  PlatformConfig,
  PlatformTarget,
} from './platform_config';
import { ArduinoBoardBuilder } from './platforms/arduino_platform';
import { DevVMPlatform } from './platforms/dev_vm_platform';
import { listAllFQBN, listAvailableBoards } from './util_platform';

export class BoardBuilderFactoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoardBuilderFactoryError';
    Error.captureStackTrace(this, BoardBuilderFactoryError);
  }
}

export interface FactoryArgs {
  vmConfig?: VMConfigArgs;
  deviceIdentity?: DeviceIdentityArgs;
  selectedLanguage?: ProgLangSelectionArgs;
}

export async function createDevPlatform(
  args: FactoryArgs,
  outputDir?: string,
): Promise<DevVMPlatform> {
  getGlobalLogger().info(`Creating Development Platform...`);
  const config: PlatformConfig = await PlatformConfig.fromConfigArgs(
    PlatformTarget.DevVM,
    args,
  );
  const platform = new DevVMPlatform(config, outputDir);
  if (args.selectedLanguage !== undefined) {
    await platform.createCompiler(args.selectedLanguage);
  }
  return platform;
}

export async function createArduinoPlatform(
  args: FactoryArgs,
  outputDir?: string,
): Promise<ArduinoBoardBuilder> {
  getGlobalLogger().info(`Creating ArduinoPlatform...`);
  const config: PlatformConfig = await PlatformConfig.fromConfigArgs(
    PlatformTarget.Arduino,
    args,
  );
  const platform = new ArduinoBoardBuilder(config, outputDir);
  if (args.selectedLanguage !== undefined) {
    await platform.createCompiler(args.selectedLanguage);
  }
  return platform;
}

export async function autoBuildArduinoPlatform(
  args: FactoryArgs,
  excludePorts: Set<string>,
  outputDir?: string,
): Promise<ArduinoBoardBuilder> {
  let serialPort: string = args.vmConfig?.serialPort ?? '';
  if (serialPort === '') {
    getGlobalLogger().info(
      'No serial port set so searching for a serial port to use',
    );
    const boards = await listAvailableBoards();
    if (boards.length === 0) {
      const errMsg = 'no serialPort provided nor a connected board detected';
      getGlobalLogger().error(errMsg);
      throw new Error(errMsg);
    }

    for (let i = 0; i < boards.length; i++) {
      const portCandidate = boards[i];
      if (!excludePorts.has(portCandidate)) {
        serialPort = portCandidate;
        break;
      }
    }

    if (serialPort === '') {
      const errMsg =
        'No free serial port detected. All available serial ports already in use';
      getGlobalLogger().error(errMsg);
      throw new Error(errMsg);
    }
  }
  const baudrate = args.vmConfig?.baudrate ?? BoardBaudRate.BD_115200;
  if (args.vmConfig?.baudrate === undefined) {
    getGlobalLogger().info(
      `No baudrate set using default ${BoardBaudRate.BD_115200}`,
    );
  }

  const boardFqbn = args.vmConfig?.fqbn;
  if (boardFqbn === undefined) {
    getGlobalLogger().error(`No FQBN provided which is mandatory`);
    throw new Error(`No FQBN provided which is mandatory`);
  }

  const fqbns = await listAllFQBN();
  const targetBoard = fqbns.find((board) => {
    return board.fqbn === boardFqbn.fqbn;
  });
  if (targetBoard === undefined) {
    const errMsg = `No board found with fqbn ${boardFqbn.fqbn}`;
    getGlobalLogger().error(errMsg);
    throw new Error(errMsg);
  }
  device.fqbn = targetBoard.fqbn;
  if (targetBoard.boardName !== '') {
    boardFqbn.boardName = targetBoard.boardName;
  }

  const boardFQBN: BoardFQBN = {
    boardName: targetBoard.boardName,
    fqbn: targetBoard.fqbn,
  };

  return await createArduinoPlatform(
    {
      vmConfig: {
        fqbn: boardFQBN,
        baudrate,
        serialPort,
      },
      selectedLanguage: args.selectedLanguage,
      deviceIdentity: args.deviceIdentity,
    },
    outputDir,
  );
}
