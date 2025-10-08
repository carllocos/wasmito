import { type Command } from 'commander';
import { ClientSideSocket } from '../src/communication/client_socket';
import { sendRequest } from '../src/runtimes/request_interface';
import { PauseRequest } from '../src/runtimes/wasmito_vm/requests/pause_request';
import { RunRequest } from '../src/runtimes/wasmito_vm/requests/run_request';
import { isSerialPort } from '../src/util/serial_port';
import { SerialConnection } from '../src/communication/serial';

export function registerRunningRequestCommand(program: Command): void {
  const commandName = 'running';
  program
    .command(`${commandName} <port>`)
    .description(
      'Pause or resume execution of a Wasm deployed on a local or MCU VM. For local VM `port` is a socket port. For MCU, `port` is a serial port and -b is required',
    )
    .option('-b <baudrate>', 'baudrate only required if port is a serial port')
    .option('--pause', 'pause execution')
    .option('--resume', 'resume execution')
    .option('--monitor', 'log output')
    .action(async (port, options) => {
      const portNr = Number(port);
      if (isNaN(portNr) && !isSerialPort(port)) {
        program.error(`not a valid (Serial) port`);
      }

      const baudRate = Number(options.b);
      if (isNaN(portNr) && isNaN(baudRate)) {
        program.error(
          `baudrate number is required when port is a serial port. Use -b to provide baudrate`,
        );
        return;
      }

      if (options.pause === undefined && options.resume === undefined) {
        program.error(`no action specified for ${commandName}`);
        return;
      }

      let channel: SerialConnection | ClientSideSocket | undefined;
      if (!isNaN(portNr)) {
        channel = new ClientSideSocket(portNr, 'localhost');
      } else {
        channel = new SerialConnection(port, baudRate);
      }
      if (options.monitor) {
        channel.addOnData(console.log);
      }
      const timeout = 100000;
      if (!(await channel.open(timeout))) {
        program.error(`failed to open connection to ${channel.channelName}`);
        return;
      }

      try {
        const req =
          options.pause !== undefined ? new PauseRequest() : new RunRequest();
        await sendRequest(channel, req, timeout);
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Failed during ${commandName} error occurred: ${errMsg}`);
      }
      if (options.monitor === undefined) {
        channel.close().catch(console.error);
      }
    });
}
