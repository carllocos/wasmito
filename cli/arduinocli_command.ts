import { type Command } from 'commander';
import { getPathArduinoCLI, getPathArduinoConfig } from '../src/project_config';
import { runArduinoCommand } from '../src/platforms/arduino_platform';

export function registerArduinoCLICommand(program: Command): void {
  program
    .command('arduino-cli <arguments...>')
    .description('run arduino-cli command on your project')
    .action(async (args) => {
      const cmdArgs = args.join(' ');
      const output = await ArduinCommand(cmdArgs);
      console.log(output);
    });
}

async function ArduinCommand(cmdArgs: string): Promise<string> {
  const arduino_cli = getPathArduinoCLI();
  const arduino_config = getPathArduinoConfig();
  let cmd = `${arduino_cli} ${cmdArgs}`;
  if (arduino_config !== undefined) {
    cmd = `${cmd} --config-file ${arduino_config}`;
  }
  return await runArduinoCommand(cmd);
}
