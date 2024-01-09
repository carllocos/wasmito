import * as net from 'net';
import { getGlobalLogger } from '../logger/logger';
import { waitForPortToBeUsed } from '../util/socket_util';
import { AbstractChannel } from './abstract_channel';

export class ClientSideSocket extends AbstractChannel {
  private readonly port: number;
  private readonly host: string;

  constructor(port: number, host: string) {
    super(`ClientSideSocket(${host}:${port})`);
    this.port = port;
    this.host = host === '' || host === 'localhost' ? '127.0.0.1' : host;
  }

  public write(
    data: string,
    cb?: ((err?: Error | undefined) => void) | undefined,
  ): boolean {
    if (this.connection !== undefined) {
      return this.connection.write(data, cb);
    } else {
      return false;
    }
  }

  public async close(): Promise<boolean> {
    if (this.connection !== undefined) {
      this.connection.destroy();
      this.connection = undefined;
      return true;
    }
    return false;
  }

  public async send(data: string): Promise<boolean> {
    return this.write(data, (err?: Error | undefined) => {
      if (err !== undefined && err !== null) {
        getGlobalLogger().error(
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
        getGlobalLogger().info(
          `ClientSideSocket: connecting to ${this.host}:${this.port}`,
        );
      });

      this.connection.on('data', (data: Buffer) => {
        this.onDataHandler(data);
      });
      this.connection.on('connect', () => {
        resolve(true);
      });
      this.connection.on('error', (err) => {
        getGlobalLogger().error(`ClientSideSocket: ${err.toString()}`);
        if (this.connection !== undefined) {
          resolve(false);
        }
      });
      this.connection.on('close', (hadError: boolean) => {
        if (hadError) {
          getGlobalLogger().error('ClientSideSocket: closed with error');
        } else {
          getGlobalLogger().info('ClientSideSocket: closed');
        }
      });
      this.connection.on('end', () => {
        getGlobalLogger().info('ClientSideSocket: end transmission');
      });
    });
  }
}
