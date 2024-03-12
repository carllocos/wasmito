import {
  DeviceIdentity,
  type DeviceIdentityArgs,
} from '../device/device_config';
import { type VMConfigArgs, VMConfiguration } from '../device/vm_config';
import { type ProgLangSelectionArgs } from '../source_mappers/compilers/prog_language_selection';
import { listAllFQBN } from './util_platform';
// import { BoardBaudRate } from '../util/serial_port';

export interface BoardFQBN {
  boardName: string;
  fqbn: string;
}

export async function assertValidFQBN(arg: any): Promise<BoardFQBN> {
  if (typeof arg !== 'object') {
    throw new Error(`fqbn should be an object`);
  }

  let boardName = arg.boardName;
  if (typeof boardName !== 'string') {
    throw new Error(
      `boardName property is mandatory and should be a string. Given ${boardName}`,
    );
  }

  const fqbn = arg.fqbn;
  if (typeof fqbn !== 'string') {
    throw new Error(
      `fqbn property is mandatory and should be a string. Given ${fqbn}`,
    );
  }

  const fqbns = await listAllFQBN();
  const targetBoard = fqbns.find((board) => {
    return board.fqbn === fqbn;
  });
  if (targetBoard === undefined) {
    throw new Error(`No board found with fqbn ${device.fqbn}`);
  }
  if (boardName === '') {
    boardName = targetBoard.boardName;
  }
  return {
    boardName,
    fqbn,
  };
}

export enum PlatformTarget {
  Arduino = 'Arduino',
  DevVM = 'DevVM',
}

export interface PlatformConfigArgs {
  target: PlatformTarget;
  vmConfig?: VMConfigArgs;
  deviceIdentity?: DeviceIdentityArgs;
  selectedLanguage?: ProgLangSelectionArgs;
}

export class PlatformConfig {
  public readonly target: PlatformTarget;
  public readonly vmConfig: VMConfiguration;
  // public readonly baudrate: BoardBaudRate;
  // public readonly fqbn: BoardFQBN;
  public readonly deviceIdentity: DeviceIdentity;

  constructor(
    target: PlatformTarget,
    // baudrate: BoardBaudRate,
    // fqbn: BoardFQBN,
    deviceIdentity: DeviceIdentity,
    vmConfig: VMConfiguration,
  ) {
    this.vmConfig = vmConfig;
    this.deviceIdentity = deviceIdentity;
    this.target = target;

    if (!deviceIdentity.hasName()) {
      deviceIdentity.name = this.generateDeviceName();
    }
    // this.baudrate = baudrate;
    // this.fqbn = fqbn;
  }

  configuredForSerial(): boolean {
    return (
      this.target !== PlatformTarget.DevVM &&
      this.vmConfig.hasSerialPort() &&
      this.vmConfig.hasBaudRate()
    );
  }

  // get selectedLanguage(): ProgLangSelectionArgs {
  //   if (this._selectedLanguage === undefined) {
  //     throw new Error('No programming language yet selected');
  //   }
  //   return this._selectedLanguage;
  // }

  // set selectedLanguage(sl: ProgLangSelectionArgs) {
  //   this._selectedLanguage = sl;
  // }

  configuredForNetwork(): boolean {
    return false;
  }

  private generateDeviceName(): string {
    return this.target;
  }

  static async fromConfigArgs(
    target: PlatformTarget,
    args: any,
  ): Promise<PlatformConfig> {
    return await createPlatformConfig(target, args);
  }
}

async function createPlatformConfig(
  target: PlatformTarget,
  args: any,
): Promise<PlatformConfig> {
  if (typeof args !== 'object') {
    throw new Error('args is expected to be an object');
  }
  if (!isValidPlatformTarget(target)) {
    throw new Error('Expected a valid platformtarget');
  }

  const vmConfig = await VMConfiguration.fromArgs(args.vmConfig ?? {});
  const id = new DeviceIdentity(args.deviceIdentity ?? {});

  return new PlatformConfig(target, id, vmConfig);
}

function isValidPlatformTarget(target: any): target is PlatformTarget {
  return target === PlatformTarget.Arduino || target === PlatformTarget.DevVM;
}

// function createPlatformBuilderConfig(
//   selectedLanguage: ProgLangSelectionArgs,
//   deviceConfigArgs: DeviceIdentityArgs,
//   vmConfigArgs: VMConfigArgs,
// ): PlatformConfig {
//   return new PlatformConfig(
//     PlatformTarget.DevVM,
//     BoardBaudRate.NONE,
//     {
//       boardName: '',
//       fqbn: '',
//     },
//     selectedLanguage,
//     deviceConfigArgs,
//     vmConfigArgs,
//   );
// }
