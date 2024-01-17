import { Command } from 'commander';
import * as figlet from 'figlet';
import {
  readProjectVersionNumber,
  readProjectDescription,
  readProjectName,
} from '../project_config';
import { DeviceManager } from '../device/device_manager';
import {
  type DeviceConfigArgs,
  parseDeviceConfigs,
} from '../device/device_config';
import {
  type LogLevel,
  parseLogLevel,
  setLogLevel,
  getGlobalLogger,
} from '../logger/logger';
import { type VMConfigArgs } from '../device';

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
    const configs: DeviceConfigArgs[] | undefined = parseDeviceConfigs(
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
    .command('spawn-vm')
    .description('spawn an Development VM locally')
    .argument('<string>', 'Wasm program to run')
    .option('-p, --port <number>', 'the port where the VM will listen upon')
    .option(
      '--pause <boolean>',
      'Should the program run on the VM be paused on start',
      true,
    )
    .option(
      '-n, --name <string>',
      'a human readable name to assign for logging',
    )
    .option('--id <string>', 'a unique identifier to identify device')
    .action(async (wasmApp, options) => {
      getGlobalLogger().info(`spawning a DevVM for program ${wasmApp}`);
      const vmConfigArgs: VMConfigArgs = {
        program: wasmApp,
        toolPort: options.port,
      };

      const maxWaitTime = 3000; // Max waittime for connecting to the DevVM
      try {
        await manager.spawnDevelopmentVM(vmConfigArgs, maxWaitTime);
      } catch (err: unknown) {
        let errMsg = '';
        if (err instanceof Error) {
          errMsg = `: ${err.message}`;
        }
        getGlobalLogger().error(`could not spawn DevVM ${errMsg}`);
        getGlobalLogger().info('closing CLI');
        process.exit(-1);
      }
    });
}

startCLI();
