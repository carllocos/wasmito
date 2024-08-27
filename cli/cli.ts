import { Command } from 'commander';
// import * as figlet from 'figlet';
import {
  readProjectVersionNumber,
  readProjectDescription,
  readProjectName,
} from '../src/project_config';
// import { type DeviceManager } from '../src/device/device_manager';
import {
  type DeviceIdentityArgs,
  parseDeviceConfigs,
} from '../src/device/device_config';
import {
  type LogLevel,
  parseLogLevel,
  setLogLevel,
  getGlobalLogger,
  setGlobalLoggerName,
} from '../src/logger/logger';
import { registerCFGCommand } from './cfg_command';
import { registerSourceMapCommand } from './sourcemap_command';
import { registerCallgraphCommand } from './callgraph_command';
import { registerProjectCommand } from './project_command';
import { registerDevicesCommand } from './devices_command';

export function startCLI(): void {
  const projectName = readProjectName();
  // console.log(figlet.textSync(projectName));

  // const dm = new DeviceManager();
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

  // registerDeviceManagerCommands(dm, program);

  registerCFGCommand(program);
  registerSourceMapCommand(program);
  registerCallgraphCommand(program);
  registerProjectCommand(program);
  registerDevicesCommand(program);

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
  setGlobalLoggerName('CLI');

  if (options.devicesConfig !== undefined) {
    const configs: DeviceIdentityArgs[] | undefined = parseDeviceConfigs(
      options.devicesConfig,
    );
    if (configs === undefined) {
      getGlobalLogger().info('Failed to load devices configurations');
    } else {
      getGlobalLogger().info('Devices configurations loaded');
    }
  }
}

// function registerDeviceManagerCommands(
//   manager: DeviceManager,
//   program: Command,
// ): void {
//   program
//     .command('spawn-vm')
//     .description('spawn an Development VM locally')
//     .argument('<string>', 'the path to the Wasm program to run')
//     .option('-p, --port <number>', 'the port where the VM will listen upon')
//     .option(
//       '--pause <boolean>',
//       'Should the program run on the VM be paused on start',
//       true,
//     )
//     .option(
//       '-n, --name <string>',
//       'a human readable name to assign for logging',
//     )
//     .option('--id <string>', 'a unique identifier to identify device')
//     .action(async (wasmApp, options) => {
//       getGlobalLogger().info(`spawning a DevVM for program ${wasmApp}`);
//       // const vmConfigArgs: VMConfigArgs = {
//       //   program: wasmApp,
//       //   toolPort: options.port,
//       // };

//       // const maxWaitTime = 3000; // Max waittime for connecting to the DevVM
//       try {
//         // await manager.spawnDevelopmentVM(vmConfigArgs, maxWaitTime);
//       } catch (err: unknown) {
//         let errMsg = '';
//         if (err instanceof Error) {
//           errMsg = `: ${err.message}`;
//         }
//         getGlobalLogger().error(`could not spawn DevVM ${errMsg}`);
//         getGlobalLogger().info('closing CLI');
//         process.exit(-1);
//       }
//     });
// }

startCLI();
