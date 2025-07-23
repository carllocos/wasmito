import { type Command } from 'commander';
import { ClientSideSocket } from '../src/communication/client_socket';
import { sendRequest } from '../src/runtimes/wasmito_vm/requests/request_interface';
import { PauseRequest } from '../src/runtimes/wasmito_vm/requests/pause_request';
import { RunRequest } from '../src/runtimes/wasmito_vm/requests/run_request';

export function registerRunningRequestCommand(program: Command): void {
  const commandName = 'running';
  program
    .command(`${commandName} <port>`)
    .description('manage events on MCU')
    .option('--pause', 'pause execution')
    .option('--resume', 'resume execution')
    .action(async (port, options) => {
      const portNr = Number(port);
      if (isNaN(portNr)) {
        program.error(`not a valid port nr`);
      }

      if (options.pause === undefined && options.resume === undefined) {
        program.error(`no action specified for ${commandName}`);
        return;
      }

      const socket = new ClientSideSocket(portNr, 'localhost');
      const timeout = 100000;
      if (!(await socket.open(timeout))) {
        program.error(`failed to open connection to localhost:${portNr}`);
        return;
      }

      try {
        const req =
          options.pause !== undefined ? new PauseRequest() : new RunRequest();
        await sendRequest(socket, req, timeout);
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Failed during ${commandName} error occurred: ${errMsg}`);
      }
      socket.close().catch(console.error);
    });
}
