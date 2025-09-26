import { type Command } from 'commander';
import { runArduinoCommand } from '../src/platforms/arduino_platform';

export function registerArduinoCLICommand(program: Command): void {
  program
    .command('arduino-cli <arguments...>')
    .description('run arduino-cli command on your project')
    .action(async (args) => {
      // TODO sanitize arguments
      const output = await runArduinoCommand(args);
      console.log(output);
    });
}
