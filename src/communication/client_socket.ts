import * as net from 'net';
import { type Channel } from '../communication/channel_interface';
import { getGlobalLogger } from '../logger/logger';
import { waitForPortToBeUsed } from '../util/socket_util';

abstract class AbstractChannel implements Channel {
  private readonly channelName: string;
  protected connection?: net.Socket;
  private dataBuffered: string = '';
  private listeners: Array<(data: string) => void>;

  constructor(channelName: string) {
    this.channelName = channelName;
    this.listeners = [];
  }

  // Abstract methods
  public abstract write(
    data: string,
    cb?: ((err?: Error | undefined) => void) | undefined,
  ): boolean;

  public abstract open(timeout?: number): Promise<boolean>;

  public abstract close(): Promise<boolean>;

  public abstract send(data: string): Promise<boolean>;

  public addOnData(callback: (data: string) => void): void {
    this.listeners.push(callback);
  }

  public removeOnData(callback: (data: string) => void): void {
    this.listeners = this.listeners.filter((cb) => {
      return cb !== callback;
    });
  }

  protected onDataHandler(data: Buffer): void {
    this.dataBuffered += data.toString();
    this.handleLines(this.parseLines());
  }

  private handleLines(lines: string[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.listeners.forEach((listener) => {
        listener(line);
      });
    }
  }

  private parseLines(): string[] {
    const lines = [];
    let idx = this.dataBuffered.indexOf('\n');
    while (idx !== -1) {
      let line = this.dataBuffered.slice(0, idx);
      this.dataBuffered = this.dataBuffered.slice(idx + 1); // skip newline
      if (line.length > 0 && line.charAt(line.length - 1) === '\r') {
        line = line.slice(0, line.length - 1);
      }
      getGlobalLogger().debug(`${this.channelName}: ${line}`);
      lines.push(line);
      idx = this.dataBuffered.indexOf('\n');
    }
    return lines;
  }
}

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
