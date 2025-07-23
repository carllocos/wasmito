import { type Command } from 'commander';
import { PushEventRequest } from '../src/runtimes/requests/inject_event_request';
import { ClientSideSocket } from '../src/communication/client_socket';
import { sendRequest } from '../src/runtimes/api/request_interface';
import { isSerialPort } from '../src/util/serial_port';
import { type Channel } from '../src/communication/channel_interface';
import { SerialConnection } from '../src/communication/serial';

export function registerEventRequestCommand(program: Command): void {
  program
    .command('event <port> [baudrate]')
    .description('manage events on MCU')
    .option('--mock-pin <pinnr>', 'push a mock event for pin nr <pinnr>')
    .action(async (port, baudrate, options) => {
      const portNr = Number(port);
      if (isNaN(portNr) && !isSerialPort(port)) {
        program.error(`not a valid socket port nr or serial port`);
      }

      const interruptNr = Number(options.mockPin);
      if (isNaN(interruptNr)) {
        program.error(`cannot convert ${options.add} to a pin nr`);
      }

      if (options.mockPin === undefined) {
        program.error(`no action specified to run for event`);
      }

      let channel: Channel | undefined;
      let br = 115200;
      if (isSerialPort(port)) {
        // serial connection
        if (baudrate !== undefined) {
          br = Number(baudrate);
          if (isNaN(br)) {
            program.error(
              `Provided baudrate ${baudrate} cannot be converted to a number`,
            );
          }
        }
        channel = new SerialConnection(port, br);
      } else {
        channel = new ClientSideSocket(portNr, 'localhost');
      }
      const timeout = 100000;
      const opened = await channel.open(timeout);
      if (!opened) {
        program.error(
          `failed to open connection to port ${port} ${baudrate === undefined ? '' : br}`,
        );
      }

      try {
        const req = new PushEventRequest(`interrupt_${interruptNr}`, '');
        const success: boolean = await sendRequest(channel, req, timeout);
        if (!success) {
          program.error(`failed to send Add Event`);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Failed during eventCommand error occurred: ${errMsg}`);
      }
      channel.close().catch(console.error);
    });
}
