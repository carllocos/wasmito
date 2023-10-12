import { program } from 'commander';
import * as figlet from 'figlet';
import {
  readProjectVersionNumber,
  readProjectDescription,
  readProjectName,
} from '../project_config';
import { parseDeviceConfig, type DevicesConfig } from '../device/device_config';
import {
  type LogLevel,
  parseLogLevel,
  setLogLevel,
  getGlobalLogger,
} from '../logger/logger';

program
  .version(readProjectVersionNumber())
  .description(readProjectDescription())
  .requiredOption(
    '-dc, --devices-config <json>',
    'path to json that describes the devices part of the analysis',
  )
  .option('-log, --log-level <type>', 'set the log-level', 'info')
  .parse(process.argv);

export function startCLI(): void {
  console.log(figlet.textSync(readProjectName()));
  program.parse();

  const options = program.opts();
  const logLevel: LogLevel | undefined = parseLogLevel(options.logLevel);
  if (logLevel === undefined) {
    getGlobalLogger().error(`Invalid log level '${options.logLevel}'`);
    process.exit(-1);
  } else {
    getGlobalLogger().info(`Setting log-level to '${options.logLevel}'`);
  }

  setLogLevel(logLevel);

  const configs: DevicesConfig | undefined = parseDeviceConfig(
    options.devicesConfig,
  );
  if (configs === undefined) {
    getGlobalLogger().info('Failed to load devices configurations');
  } else {
    getGlobalLogger().info('Devices configurations loaded');
  }
}

startCLI();
