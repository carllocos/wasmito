import { Command } from 'commander';
import {
  readProjectVersionNumber,
  readProjectDescription,
  readProjectName,
} from '../src/project_config';
import {
  type DeviceIdentityArgs,
  parseDeviceConfigs,
} from '../src/device/device_config';
import {
  type LogLevel,
  parseLogLevel,
  //setLogLevel,
  getGlobalLogger,
  setGlobalLoggerName,
} from '../src/logger/logger';
import { registerCFGCommand } from './cfg_command';
import { registerSourceMapCommand } from './sourcemap_command';
import { registerCallgraphCommand } from './callgraph_command';
import { registerProjectCommand } from './project_command';
import { registerDevicesCommand } from './devices_command';
import { registerUploadCommand } from './upload_command';
import { registerDebugOpCommand } from './debugop_command';
import { registerWCFGCommand } from './wcfg_command';
import { registerWasmModuleCommand } from './wasm_command';
import { registerEventRequestCommand } from './event_command';
import { registerBreakpointRequestCommand } from './breakpoint_command';
import { registerRunningRequestCommand } from './running_command';
import { registerCompileCommand } from './compile_command';
import { registerInterpretRequestCommand } from './interpret_command';
import { registerArduinoCLICommand } from './arduinocli_command';
import { registerInspectRequestCommand } from './inspect_command';
import { registerWatCommand } from './wat_command';
import { registerCoverageCommand } from './coverage_command';

export function startCLI(): void {
  const projectName = readProjectName();
  const program = new Command();
  program
    .name(projectName)
    .description(readProjectDescription())
    .version(readProjectVersionNumber())
    .option('-l, --log-level <type>', 'set the log-level');

  registerCFGCommand(program);
  registerWCFGCommand(program);
  registerSourceMapCommand(program);
  registerCallgraphCommand(program);
  registerProjectCommand(program);
  registerDevicesCommand(program);
  registerUploadCommand(program);
  registerCompileCommand(program);
  registerDebugOpCommand(program);
  registerWasmModuleCommand(program);
  registerWatCommand(program);
  registerEventRequestCommand(program);
  registerBreakpointRequestCommand(program);
  registerInspectRequestCommand(program);
  registerRunningRequestCommand(program);
  registerInterpretRequestCommand(program);
  registerArduinoCLICommand(program);
  registerCoverageCommand(program);

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
  }
  // else {
  //   getGlobalLogger().info(`Setting log-level to '${logLevel}'`);
  // }
  //setLogLevel(logLevel);
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

startCLI();
