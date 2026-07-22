import * as net from 'net';
import { createLogger, Logger } from '../logger/logger';
import { getFreePort, isPortInUse } from '../util/socket_util';
import { type Channel } from './channel_interface';
import { timeoutPromise } from '../util/promise_util';
import { Subscription } from '../hooks/isubscribe';

export class ShareChannelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShareChannelError';
    Error.captureStackTrace(this, ShareChannelError);
  }
}

export class ShareChannel implements Channel {
  private readonly server: net.Server;
  public readonly channelToShare: Channel;
  private readonly _initialServerPort: number;
  private _serverPort: number;
  private readonly logger: Logger;
  private clients: net.Socket[];
  private writeListeners: Subscription<string | Uint8Array>;

  readonly channelName: string;

  constructor(channelToShare: Channel, serverPort?: number) {
    this.server = net.createServer(this.handleConnection.bind(this));
    this.channelToShare = channelToShare;
    this._initialServerPort = serverPort ?? -1;
    this._serverPort = this._initialServerPort;
    this.clients = [];
    this.channelName = `SharedChannel for ${this.channelToShare.channelName}`;
    this.logger = createLogger(this.channelName);
    this.writeListeners = new Subscription(
      (i: string | Uint8Array) => i,
      this.logger,
    );
  }

  /*
   * Server methods
   */

  get serverPort(): number {
    return this._serverPort;
  }

  async open(): Promise<boolean> {
    return await this.channelToShare.open();
  }

  async close(timedout?: number): Promise<boolean> {
    return await this.channelToShare.close(timedout);
  }

  public async write(
    data: string | Uint8Array,
    cb?: ((err?: Error | null | undefined) => void) | undefined,
  ): Promise<boolean> {
    const s = await this.channelToShare.write(data, cb);
    if (s) this.writeListeners.onSubscriptionData(data);
    return s;
  }

  addOnWriteListener(callback: (data: string | Uint8Array) => void): void {
    this.writeListeners.subscribe(callback, false);
  }

  removeOnWriteListener(callback: (data: string | Uint8Array) => void): void {
    this.writeListeners.unSubscribe(callback);
  }

  async send(data: string): Promise<boolean> {
    return await this.channelToShare.send(data);
  }

  addOnData(callback: (data: string) => void): void {
    this.channelToShare.addOnData(callback);
  }

  removeOnData(callback: (data: string) => void): void {
    this.channelToShare.removeOnData(callback);
  }

  public async startServer(): Promise<boolean> {
    let portToUse = this._initialServerPort;
    if (portToUse !== -1) {
      const used = await isPortInUse(this._initialServerPort);
      if (used) {
        this.logger.error(`Port ${this._initialServerPort} is already in use`);
        return false;
      }
    } else {
      const freePort = await getFreePort();
      if (freePort === undefined) {
        return false;
      }
      portToUse = freePort;
    }
    return new Promise<boolean>((resolve) => {
      this.server.listen(portToUse, () => {
        this._serverPort = portToUse;
        this.logger.info(`listening on port ${this._serverPort}`);
        // TODO introduce another kind of addOnBuffer which gives buffers without decoding?
        this.channelToShare.addOnData(this.fanOutData.bind(this));
        resolve(true);
      });
    });
  }

  public async closeServer(timeout?: number): Promise<boolean> {
    const closePromise = new Promise<boolean>((resolve, reject) => {
      this.server.close((err?: Error | undefined) => {
        if (err !== undefined && err !== null) {
          this.logger.error(
            `An error occurred while closing the server: ${err.name}: ${err.message}`,
          );
          reject(err);
        }
        this.clients.forEach((c) => {
          c.end();
        });
        this.clients = [];
        this._serverPort = -1;
        resolve(true);
      });
    });

    if (timeout === undefined) {
      return await closePromise;
    } else {
      return await timeoutPromise(
        closePromise,
        timeout,
        new ShareChannelError(
          `Closing server ${this.channelName} timedout after ${timeout}ms`,
        ),
      );
    }
  }

  private handleConnection(newClient: net.Socket): void {
    this.logger.info('new Client connected');
    this.clients.push(newClient);
    newClient.on('end', () => {
      this.logger.info('Client disconnected');
      this.clients = this.clients.filter((s) => {
        return s !== newClient;
      });
    });

    newClient.on('error', (err) => {
      this.logger.error('Client experienced error: ', err);
    });
    newClient.on('close', (hadError) => {
      if (hadError) {
        this.logger.error('client closed with error');
      } else {
        this.logger.info('client closed');
      }
      this.clients = this.clients.filter((s) => {
        return s !== newClient;
      });
    });
    newClient.on('data', (data: Buffer) => {
      this.channelToShare.write(data, (err) => {
        if (err !== undefined && err !== null) {
          this.logger.error(
            `Error occurred when writing to target socket: ${err.message}`,
          );
        }
      });
    });
  }

  private fanOutData(data: string): void {
    const hexRegex = /^(?:[0-9a-fA-F]+(?:\n)*)*$/;
    if (hexRegex.test(data)) {
      this.clients.forEach((client: net.Socket) => {
        const cleanedData = data.endsWith('\n') ? data : `${data}\n`;
        client.write(cleanedData, (err) => {
          if (err !== undefined && err !== null) {
            this.logger.error(
              `Error occurred when writing to socket client: ${err.message}`,
            );
          }
        });
      });
    }
  }
}
