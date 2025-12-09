import * as net from 'net';
import { AbstractChannel } from './abstract_channel';
import { waitMilliSeconds } from '../util/promise_util';

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
    if (this.connection === undefined) return false;

    const s = this.connection.write(data, cb);
    if (s) this.fanout(data);
    return s;
  }

  public async close(_timeout?: number): Promise<boolean> {
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
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const waitBeforeNextAttempt = 1000;
      await waitMilliSeconds(waitBeforeNextAttempt);
      this.connection = await this.createConnection();
      let totalTimeWaited = 0;
      while (this.connection === undefined) {
        if (timeout !== undefined && timeout <= totalTimeWaited) {
          break;
        }
        await waitMilliSeconds(waitBeforeNextAttempt);
        totalTimeWaited += waitBeforeNextAttempt;
        this.connection = await this.createConnection();
      }

      if (this.connection !== undefined) {
        this.connection.on('connect', () => {
          this.logger.debug('connected');
        });

        this.connection.on('data', (data: Buffer) => {
          this.onDataHandler(data);
        });

        this.connection.on('error', (err) => {
          this.logger.error(err.toString());
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
      }
      resolve(this.connection !== undefined);
    });
  }

  async createConnection(): Promise<net.Socket | undefined> {
    return new Promise((resolve) => {
      const addr = { port: this.port, host: this.host };
      const s = new net.Socket();
      s.connect(addr, () => {
        this.logger.info(`connecting to ${this.host}:${this.port}`);
      });
      s.on('connect', () => {
        resolve(s);
      });
      s.on('error', (err) => {
        this.logger.error(err.toString());
        resolve(undefined);
      });
    });
  }
}
