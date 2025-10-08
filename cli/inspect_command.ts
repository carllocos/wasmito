import { type Command } from 'commander';
import { ClientSideSocket } from '../src/communication/client_socket';
import { StateRequest } from '../src/runtimes/wasmito_vm/requests/inspect_request';
import {
  isSuccessfulMessage,
  sendRequest,
} from '../src/runtimes/request_interface';
import { isSerialPort } from '../src/util/serial_port';
import { SourceMap } from '../src/source_mappers/source_map';
import { isFilePath } from '../src/util/file_util';
import { SourceMapFromJSON } from '../src/source_mappers/source_map_builder';
import { SerialConnection } from '../src/communication/serial';

export function registerInspectRequestCommand(program: Command): void {
  program
    .command('inspect <port>')
    .description(
      'Inspect program state either on Local VM or MCU VM. For local VM `port` is a socket port. For MCU, `port` is a serial port. If -w option is provided, then provide source level state',
    )
    .option('-b <baudrate>', 'baudrate only required if port is a serial port')
    .option('-pc', 'inspect program counter')
    .option('-w <path>', 'provide source mapping stored as JSON')
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

      const mappingsPath = options.w;
      let sourceMap: undefined | SourceMap;
      if (mappingsPath !== undefined) {
        if (!isFilePath(mappingsPath)) {
          program.error(
            `-w not a valid path to source mapping JSON. Given ${mappingsPath}`,
          );
        }
        sourceMap = SourceMapFromJSON(mappingsPath);
      }

      const req = new StateRequest();
      if (options.Pc !== undefined) {
        req.includePC();
      }

      if (req.isRequestEmpty()) {
        program.error(
          `state request is empty. Use options to activate state to request`,
        );
      }

      let channel: SerialConnection | ClientSideSocket | undefined;
      if (!isNaN(portNr)) {
        channel = new ClientSideSocket(portNr, 'localhost');
      } else {
        channel = new SerialConnection(port, baudRate);
      }

      const timeout = 100000;
      if (!(await channel.open(timeout))) {
        program.error(`failed to open connection to ${channel.channelName}`);
        return;
      }

      try {
        const response = await sendRequest(channel, req);
        console.log(response);
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`error occurred: ${errMsg}`);
      }
      channel.close().catch(console.error);
    });
}
