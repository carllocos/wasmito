import { type Command } from 'commander';
import { ClientSideSocket } from '../src/communication/client_socket';
import { Breakpoint } from '../src/debugger/breakpoint';
import { StateRequest } from '../src/runtimes/requests/inspect_request';
import {
  isSuccessfulMessage,
  sendRequest,
} from '../src/runtimes/api/request_interface';

export function registerBreakpointRequestCommand(program: Command): void {
  program
    .command('break <port>')
    .description('manage breakpoints')
    .option('--add <addr>', 'add a breakpoint to addr')
    .action(async (port, options) => {
      const portNr = Number(port);
      if (isNaN(portNr)) {
        program.error(`not a valid port nr`);
      }

      const addr = Number(options.add);
      if (isNaN(addr)) {
        program.error(`cannot convert ${options.add} to a number`);
        return;
      }

      if (options.add === undefined) {
        program.error(`no action specified to run for event`);
        return;
      }

      const bp = new Breakpoint(
        {
          source: '',
          linenr: 0,
          colnr: 0,
          name: '',
          address: addr,
        },
        new StateRequest().includePC(),
      );
      const socket = new ClientSideSocket(portNr, 'localhost');
      const timeout = 100000;
      if (!(await socket.open(timeout))) {
        program.error(`failed to open connection to localhost:${portNr}`);
        return;
      }

      try {
        for (const req of bp.createRequests()) {
          const response = await sendRequest(socket, req);
          if (!isSuccessfulMessage(response)) {
            program.error(`failed to add breakpoint`);
            return;
          }
        }
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`error occurred: ${errMsg}`);
      }
      socket.close().catch(console.error);
    });
}
