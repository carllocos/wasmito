import { Command } from 'commander';
import * as figlet from 'figlet';
import {
  readProjectVersionNumber,
  readProjectDescription,
  readProjectName,
} from '../project_config';
import { DeviceManager } from '../device/device_manager';
import {
  type DeviceConfig,
  parseDeviceConfigs,
  parseDeviceConfig,
  DeviceMode,
} from '../device/device_config';
import {
  type LogLevel,
  parseLogLevel,
  setLogLevel,
  getGlobalLogger,
} from '../logger/logger';

export function startCLI(): void {
  const projectName = readProjectName();
  console.log(figlet.textSync(projectName));

  const dm = new DeviceManager();
  const program = new Command();
  program
    .name(projectName)
    .description(readProjectDescription())
    .version(readProjectVersionNumber())
    .option(
      '-dc, --devices-config <string>',
      'path to json that describes the devices part of the analysis',
    )
    .option('-log, --log-level <type>', 'set the log-level');

  registerDeviceManagerCommands(dm, program);

  program.parse(process.argv);

  const options = program.opts();
  let chosenLogLevel = 'info';
  if (options.logLevel !== undefined) {
    chosenLogLevel = options.logLevel;
  } else if (process.env.LogLevel !== undefined) {
    chosenLogLevel = process.env.LogLevel;
  }

  const logLevel: LogLevel | undefined = parseLogLevel(chosenLogLevel);
  if (logLevel === undefined) {
    getGlobalLogger().error(`Invalid log level '${logLevel}'`);
    process.exit(-1);
  } else {
    getGlobalLogger().info(`Setting log-level to '${logLevel}'`);
  }
  setLogLevel(logLevel);

  if (options.devicesConfig !== undefined) {
    const configs: DeviceConfig[] | undefined = parseDeviceConfigs(
      options.devicesConfig,
    );
    if (configs === undefined) {
      getGlobalLogger().info('Failed to load devices configurations');
    } else {
      getGlobalLogger().info('Devices configurations loaded');
    }
  }
}

function registerDeviceManagerCommands(
  manager: DeviceManager,
  program: Command,
): void {
  program
    .command('spawn-emulator')
    .description('spawn an emulator locally')
    .argument('<string>', 'Wasm program to run')
    .option(
      '-p, --port <number>',
      'the port where the emulator will listen upon',
    )
    .option('--pause <boolean>', 'Should the emulator be paused on start', true)
    .option(
      '-n, --name <string>',
      'a human readable name to assign for logging',
    )
    .option('--id <string>', 'a unique identifier to identify device')
    .action(async (wasmApp, options) => {
      getGlobalLogger().info(`spawning emulator for program ${wasmApp}`);
      const config: any = {
        program: wasmApp,
        mode: DeviceMode.Emulate,
        port: options.port ?? '',
        id: options.id ?? '1',
        name: options.name ?? 'emulator',
      };

      const deviceConfig = parseDeviceConfig(config);
      if (deviceConfig === undefined) {
        getGlobalLogger().info('Failed to load device configuration');
        getGlobalLogger().info('Closing CLI');
        process.exit(-1);
      }
      const maxWaitTime = 3000; // Max waittime for connecting to the emulator
      try {
        await manager.spawnEmulator(deviceConfig, maxWaitTime);
      } catch (err: unknown) {
        let errMsg = '';
        if (err instanceof Error) {
          errMsg = `: ${err.message}`;
        }
        getGlobalLogger().error(`could not spawn emulator ${errMsg}`);
        getGlobalLogger().info('closing CLI');
        process.exit(-1);
      }
    });
}

startCLI();
