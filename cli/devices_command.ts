import { Option, type Command } from 'commander';
import { isFilePath, pathJoin, readFileAsJSON } from '../src/util/file_util';
import { writeFileSync } from 'fs';
import { getProjectDir, isProjectDirPresent } from './project_command';
import {
  createDeviceID,
  DefaultDeviceName,
  type DeviceIdentityArgs,
} from '../src/device/device_config';
import { ArduinoListBoardsFQBNs } from '../src/platforms/arduino_platform';
import { convertToBoardBaudRate, isSerialPort } from '../src/util/serial_port';
import {
  PlatformConfig,
  PlatformTarget,
} from '../src/platforms/platform_config';
import { type VMConfigArgs } from '../src/device/vm_config';

interface DevicesJSON {
  devices: DeviceJSON[];
}

interface DeviceJSON {
  identity: DeviceIdentityArgs;
  platform: PlatformTarget;

  // only if platform arduino
  boardName: string;
  fqbn: string;
  baudrate: number;
  serial: string;
}

function createNewDevice(platform: PlatformTarget, name?: string): DeviceJSON {
  return {
    identity: {
      id: createDeviceID(),
      name: name ?? DefaultDeviceName,
    },
    platform,
    fqbn: '',
    boardName: '',
    baudrate: -1,
    serial: '',
  };
}

export function registerDevicesCommand(program: Command): void {
  program
    .command('devices')
    .description(`manage MCUs or DevBoards part of your project.`)
    .requiredOption(
      '--d <id-or-name>',
      'The id or name of the device to which the actions will apply.',
      '',
    )
    .option('--add [name]', `add a device with [name].`)
    .option('--rmv', `remove <id-or-name> from the project config.`)
    .option('--serial <port>', `set the serial <port> of <id-or-name>`)
    .addOption(
      new Option('-p, --platform <platform>', 'platform of choice').choices([
        PlatformTarget.Arduino,
        PlatformTarget.DevVM,
      ]),
    )
    .option('--fqbn <fqbn>', `set the fqbn of <id-or-name>.`)
    .option('--baudrate <baudrate>', `set the baudrate of <id-or-name>`)
    .option('--list', 'display all registered devices')
    .action(async (options) => {
      if (!isProjectDirPresent()) {
        program.error(
          `There is no project directory defined in the current working directory. First create a project see 'help project'`,
        );
      }

      let actionHandled = false;
      const devicesPath = getDevicesFilePath();
      if (!isFilePath(devicesPath)) {
        createDevicesFileIfNeeded(devicesPath);
      }

      let addPlatformHandled = false;
      const idOrName = options.d;

      if (options.add !== undefined) {
        actionHandled = true;
        if (idOrName !== '') {
          program.error(`Cannot provide <id-or-name> when adding a device`);
          return;
        } else {
          let platform = PlatformTarget.DevVM;
          if (options.platform !== undefined) {
            platform = options.platform;
            addPlatformHandled = true;
          }
          const devName =
            typeof options.add === 'string' ? options.add : undefined;
          const dev = createNewDevice(platform, devName);
          await addDevice(dev, devicesPath);
        }
      }

      if (options.platform !== undefined && !addPlatformHandled) {
        // happens only when a device got added with the platform flag passed as argument:w
        actionHandled = true;
        if (idOrName === '') {
          program.error(`<id-or-name> is needed to run this command`);
          return;
        } else {
          await changePlatform(
            program,
            devicesPath,
            idOrName,
            options.platform,
          );
        }
      }

      if (options.rmv !== undefined) {
        actionHandled = true;
        if (idOrName === '') {
          program.error(`<id-or-name> is expected when removing a device`);
          return;
        }

        await removeDevice(program, idOrName, devicesPath);
      }

      if (options.fqbn !== undefined) {
        actionHandled = true;
        await addFQBN(program, devicesPath, idOrName, options.fqbn);
      }

      if (options.baudrate !== undefined) {
        actionHandled = true;
        await addBaudrate(program, devicesPath, idOrName, options.baudrate);
      }

      if (options.serial !== undefined) {
        actionHandled = true;
        if (idOrName === '') {
          program.error(
            `<id-or-name> is expected when setting the serial port`,
          );
          return;
        } else {
          await addSerialPort(program, devicesPath, idOrName, options.serial);
        }
      }

      if (options.list !== undefined) {
        actionHandled = true;
        await listDevices(devicesPath);
      }

      if (!actionHandled) {
        program.error(`no action provided. Type 'help device'`);
      }
    });
}

async function listDevices(devicesPath: string): Promise<void> {
  const devices = await readDevices(devicesPath);

  const dstr = devices
    .map((d) => {
      return `${d.identity.name}\t${d.platform}\t${d.baudrate}\t${d.serial}\t${d.identity.id}`;
    })
    .join('\n');

  const header = `name\tplatform\tbaudrate\tport\tid`;
  console.log(`registerd devices:\n${header}\n${dstr}`);
}
async function addDevice(dev: DeviceJSON, devicesPath: string): Promise<void> {
  const devices = await readDevices(devicesPath);
  devices.push(dev);

  const found = devices.filter((d: DeviceJSON) => {
    return d.identity.name === dev.identity.name;
  });
  if (found.length > 1) {
    console.warn(
      `#${found.length} devices found named '${dev.identity.name}': [${found.map((d: object) => JSON.stringify(d)).join(', ')}]`,
    );
  }

  writeDevices(devices, devicesPath);
  console.log(
    `Device name='${dev.identity.name}' id='${dev.identity.id}' added`,
  );
}

async function removeDevice(
  program: Command,
  idOrName: string,
  devicesPath: string,
): Promise<void> {
  const devices = await readDevices(devicesPath);
  const newDevices: DeviceJSON[] = [];
  const devicesToRmv: DeviceJSON[] = [];
  for (const d of devices) {
    if (d.identity.id === idOrName || d.identity.name === idOrName) {
      devicesToRmv.push(d);
    } else {
      newDevices.push(d);
    }
  }

  if (devicesToRmv.length === 0) {
    program.error(`No device found with id or name '${idOrName}'`);
  } else if (devicesToRmv.length > 1) {
    const devicesStr = devicesToStr(devicesToRmv);
    program.error(
      `Multiple devices found with id or name '${idOrName}':\n${devicesStr}`,
    );
  } else {
    writeDevices(newDevices, devicesPath);
    const d = devicesToRmv[0];
    console.log(
      `Removed device name='${d.identity.name}' id='${d.identity.id}'`,
    );
  }
}

function devicesToStr(devices: DeviceJSON[]): string {
  const devicesStr = devices
    .map((d) => {
      return `${d.identity.name}\t${d.identity.id}`;
    })
    .join('\n');
  const header = 'name\tid';
  return `${header}\n${devicesStr}`;
}

async function addFQBN(
  program: Command,
  devicesPath: string,
  idOrName: string,
  fqbn: string,
): Promise<void> {
  const devices = await getMatchingDeviceOrError(
    program,
    devicesPath,
    idOrName,
    PlatformTarget.Arduino,
  );
  if (devices === undefined) {
    return;
  }

  const [device, allDevices] = devices;
  const boards = await ArduinoListBoardsFQBNs();
  const found = boards.find((b) => {
    return b.fqbn === fqbn;
  });

  if (found !== undefined) {
    const oldfqbn = device.fqbn;
    device.boardName = found.boardName;
    device.fqbn = found.fqbn;
    writeDevices(allDevices, devicesPath);

    let s = `fqbn of '${idOrName}' changed to '${found.fqbn}'`;
    if (oldfqbn !== '') {
      s = `${s} (old '${oldfqbn}')'`;
    }
    console.log(s);
  } else {
    program.error(
      `No fqbn found that matches '${fqbn}'. Type '--list-fqbns' for a full list`,
    );
  }
}

async function addBaudrate(
  program: Command,
  devicesPath: string,
  idOrName: string,
  baudrateStr: string,
): Promise<void> {
  const baudrate = Number(baudrateStr);
  if (isNaN(baudrate) || convertToBoardBaudRate(baudrate) === undefined) {
    program.error(
      `The provided baudrate '${baudrateStr}' is not a valid number`,
    );
    return;
  }

  const devices = await getMatchingDeviceOrError(
    program,
    devicesPath,
    idOrName,
    PlatformTarget.Arduino,
  );
  if (devices === undefined) {
    return;
  }
  const [device, allDevices] = devices;

  const oldBaudrate = device.baudrate;
  device.baudrate = baudrate;
  writeDevices(allDevices, devicesPath);
  if (oldBaudrate !== -1) {
    console.log(
      `baudrate of '${idOrName}' changed from '${oldBaudrate}' -> ${baudrate}`,
    );
  } else {
    console.log(`baudrate of '${idOrName}' changed to ${baudrate}`);
  }
}

async function readDevices(devicesPath: string): Promise<DeviceJSON[]> {
  const content: DevicesJSON = await readFileAsJSON(devicesPath);
  return content.devices;
}

function writeDevices(devices: DeviceJSON[], devicesPath: string): void {
  const updated: DevicesJSON = {
    devices,
  };
  const content = JSON.stringify(updated);
  writeFileSync(devicesPath, content);
}

async function getMatchingDeviceOrError(
  program: Command,
  devicesPath: string,
  idOrName: string,
  expectedPlatform?: string,
): Promise<[DeviceJSON, DeviceJSON[]] | undefined> {
  const matching = await getMatchingDevices(devicesPath, idOrName);
  if (matching === undefined) {
    program.error(`No device register under the name or id '${idOrName}'`);
    return undefined;
  }

  const [devicesFound, allDevices] = matching;
  if (devicesFound.length > 1) {
    const devicesStr = devicesToStr(devicesFound);
    program.error(
      `multiple devices found with id or name '${idOrName}':\n${devicesStr}$`,
    );
    return undefined;
  }

  const device = devicesFound[0];
  if (expectedPlatform !== undefined && device.platform !== expectedPlatform) {
    program.error(
      `Command is meant for a device that targets '${expectedPlatform}' but '${idOrName}' targets '${device.platform}'`,
    );
    return undefined;
  }
  return [device, allDevices];
}

function createDevicesFileIfNeeded(devicesPAth: string): void {
  const d: DevicesJSON = {
    devices: [],
  };

  writeFileSync(devicesPAth, JSON.stringify(d));
}
/**
 *
 * @param devicesPath path to devices.json
 * @param idOrName id or name of a device
 * @returns all the devices that match name or id and all the devices read. If no device is found it retunrs undefined
 */
async function getMatchingDevices(
  devicesPath: string,
  idOrName: string,
): Promise<[DeviceJSON[], DeviceJSON[]] | undefined> {
  const devices = await readDevices(devicesPath);
  const filtered = devices.filter((d) => {
    return d.identity.name === idOrName || d.identity.id === idOrName;
  });
  if (filtered.length === 0) {
    return undefined;
  } else {
    return [filtered, devices];
  }
}

async function changePlatform(
  program: Command,
  devicesPath: string,
  idOrName: string,
  platform: PlatformTarget,
): Promise<void> {
  const match = await getMatchingDeviceOrError(program, devicesPath, idOrName);
  if (match === undefined) {
    return;
  }

  const [device, allDevices] = match;
  const old = device.platform;
  device.platform = platform;
  if (old !== platform) {
    writeDevices(allDevices, devicesPath);
  }

  const logStr = `Device '${idOrName}' platform changed to ${platform} (old ${old})`;
  console.log(logStr);
}

async function addSerialPort(
  program: Command,
  devicesPath: string,
  idOrName: string,
  serial: string,
): Promise<void> {
  if (!isSerialPort(serial)) {
    program.error(`The provided serial '${serial}' is not a valid port`);
    return;
  }

  const match = await getMatchingDeviceOrError(
    program,
    devicesPath,
    idOrName,
    PlatformTarget.Arduino,
  );
  if (match === undefined) {
    return;
  }

  const [device, allDevices] = match;
  const old = device.serial;
  device.serial = serial;
  if (old !== serial) {
    writeDevices(allDevices, devicesPath);
  }

  let logStr = `Device '${idOrName}' serial changed to ${serial}`;
  if (old !== '') {
    logStr = `${logStr} (old '${old}')`;
  }
  console.log(logStr);
}

export async function getProjectDevices(): Promise<DeviceJSON[]> {
  const dp = getDevicesFilePath();
  return await readDevices(dp);
}

function getDevicesFilePath(): string {
  const p = getProjectDir();
  return pathJoin(p, 'devices.json');
}

export async function getDeviceConfiguration(
  idOrName: string,
  updatesOnTheFly?: VMConfigArgs,
): Promise<PlatformConfig | string[]> {
  const devices = await readDevices(getDevicesFilePath());
  const found = devices.filter((d) => {
    return d.identity.id === idOrName || d.identity.name === idOrName;
  });
  if (found.length === 0) {
    return [`no device found with id or name '${idOrName}'`];
  } else if (found.length > 1) {
    return [`found multiple devices that equal name '${idOrName}'`];
  }
  // VMConfigArgs
  const device = found[0];
  const vmConfig: VMConfigArgs = {};
  if (device.platform === PlatformTarget.Arduino) {
    vmConfig.serialPort = updatesOnTheFly?.serialPort ?? device.serial;
    vmConfig.baudrate = updatesOnTheFly?.baudrate ?? device.baudrate;
    vmConfig.fqbn = {
      boardName: device.boardName,
      fqbn: device.fqbn,
    };
  }
  vmConfig.pauseOnStart = updatesOnTheFly?.pauseOnStart ?? false;
  vmConfig.disableStrictModuleLoad =
    updatesOnTheFly?.disableStrictModuleLoad ?? true;
  return await PlatformConfig.fromConfigArgs(
    device.platform,
    vmConfig,
    device.identity,
  );
}
