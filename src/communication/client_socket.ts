import * as net from 'net';
import { waitForPortToBeUsed } from '../util/socket_util';
import { AbstractChannel } from './abstract_channel';

function createLoggerName(prefix: string, host: string, port: number): string {
  if (prefix === '') {
    return `(socket ${host} ${port})`;
  } else {
    return `${prefix} (socket ${host}:${port})`;
  }
}

export class ClientSideSocket extends AbstractChannel {
  private readonly port: number;
  private readonly host: string;

  constructor(port: number, host: string, loggerName: string = '') {
    super(createLoggerName(loggerName, host, port));
    this.port = port;
    this.host = host === '' || host === 'localhost' ? '127.0.0.1' : host;
  }

  public write(
    data: string | Uint8Array,
    cb?: ((err?: Error | null | undefined) => void) | undefined,
  ): boolean {
    if (this.connection !== undefined) {
      return this.connection.write(data, cb);
    } else {
      return false;
    }
  }

  public async close(timeout?: number): Promise<boolean> {
    if (this.connection !== undefined) {
      this.connection.destroy();
      this.connection = undefined;
      return true;
    }
    return false;
  }

  public async send(data: string): Promise<boolean> {
    return this.write(data, (err?: Error | null | undefined) => {
      if (err !== undefined && err !== null) {
        this.logger.error(
          `Error occurred when writing to socket: ${err.message}`,
        );
      }
    });
  }

  public async open(timeout?: number): Promise<boolean> {
    const isPortOpen = await waitForPortToBeUsed(this.port, this.host, timeout);
    if (!isPortOpen) {
      return false;
    }
    return new Promise((resolve) => {
      const addr = { port: this.port, host: this.host };
      this.connection = new net.Socket();
      this.connection.connect(addr, () => {
        this.logger.info(`connecting to ${this.host}:${this.port}`);
      });

      this.connection.on('data', (data: Buffer) => {
        this.onDataHandler(data);
      });
      this.connection.on('connect', () => {
        resolve(true);
      });
      this.connection.on('error', (err) => {
        this.logger.error(err.toString());
        if (this.connection !== undefined) {
          resolve(false);
        }
      });
      this.connection.on('close', (hadError: boolean) => {
        if (hadError) {
          this.logger.error('closed with error');
        } else {
          this.logger.info('closed');
        }
      });
      this.connection.on('end', () => {
        this.logger.info('end transmission');
      });
    });
  }
}
