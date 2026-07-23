import { SerialPort } from 'serialport';
import { type Channel } from './channel_interface';
import { createLogger, Logger } from '../logger/logger';
import { timeoutPromise } from '../util/promise_util';
import { Subscription } from '../hooks/isubscribe';

// TODO remove code duplication from client-side socket

function createLoggerName(prefix: string, serialPort: string): string {
  if (prefix === '') {
    return `(${serialPort})`;
  } else {
    return `${prefix} (${serialPort})`;
  }
}

export class SerialConnection implements Channel {
  private port?: SerialPort;
  private readonly portName: string;
  private readonly baudRate: number;
  private callbacks: Array<(data: string) => void> = [];
  private dataBuffered: string = '';
  private readonly logger: Logger;
  private readonly removedListeners: Set<(data: string) => void>;
  private writeListeners: Subscription<string | Uint8Array>;

  readonly channelName: string;

  constructor(portName: string, baudRate: number, loggerName: string = '') {
    this.portName = portName;
    this.baudRate = baudRate;
    this.channelName = createLoggerName(loggerName, this.portName);
    this.logger = createLogger(this.channelName);
    this.removedListeners = new Set();
    this.writeListeners = new Subscription(
      (i: string | Uint8Array) => i,
      this.logger,
    );
  }

  public async write(
    data: any,
    cb?: ((err?: Error | null | undefined) => void) | undefined,
  ): Promise<boolean> {
    if (this.port === undefined) return false;
    const s = this.port.write(data, cb);
    if (s) this.writeListeners.onSubscriptionData(data);
    return s;
  }

  addOnWriteListener(callback: (data: string | Uint8Array) => void): void {
    const oneTimeListener = false;
    this.writeListeners.subscribe(callback, oneTimeListener);
  }

  removeOnWriteListener(callback: (data: string | Uint8Array) => void): void {
    this.writeListeners.unSubscribe(callback);
  }

  addOnData(callback: (data: string) => void): void {
    this.callbacks.push(callback);
  }

  removeOnData(callback: (data: string) => void): void {
    this.callbacks = this.callbacks.filter((c) => c !== callback);
  }

  protected onDataHandler(data: Buffer): void {
    this.dataBuffered += data.toString();
    this.handleLines(this.parseLines());
    this.callbacks = this.callbacks.filter((cb) => {
      return !this.removedListeners.has(cb);
    });
    this.removedListeners.clear();
  }

  private handleLines(lines: string[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.callbacks.forEach((cb) => {
        if (!this.removedListeners.has(cb)) {
          cb(line);
        }
      });
    }
  }

  private parseLines(): string[] {
    const lines = [];
    let idx = -1;
    while ((idx = this.dataBuffered.indexOf('\n')) !== -1) {
      const line = this.dataBuffered.slice(0, idx).replace(/\r/g, '');
      this.dataBuffered = this.dataBuffered.slice(idx + 1); // skip newline;
      this.logger.debug(line);
      lines.push(line);
    }
    return lines;
  }

  async send(data: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.port === undefined) {
        reject(new Error('Serial port is not open.'));
      } else if (!this.port.isOpen) {
        reject(new Error('Serial port is not open.'));
      } else {
        this.port.write(data, (err) => {
          if (err !== undefined && err !== null) {
            reject(new Error(`Error sending data: ${err?.message}`));
          } else {
            resolve(true);
          }
        });
      }
    });
  }

  async open(timeout?: number): Promise<boolean> {
    const openPromise = new Promise<boolean>((resolve) => {
      this.port = new SerialPort({
        path: this.portName,
        baudRate: this.baudRate,
        autoOpen: false,
      });

      this.port.on('data', (data: Buffer) => {
        this.onDataHandler(data);
      });

      // Handle errors
      this.port.on('error', (err: Error) => {
        this.logger.error(`Serial port error: ${err.message}`);
      });

      // Open the serial port when the instance is created
      this.port.open((err) => {
        if (err !== null) {
          this.logger.error(`Error opening serial port: ${err.message}`);
          resolve(false);
        } else {
          this.logger.info('Serial port opened successfully.');
          resolve(true);
        }
      });
    });

    if (timeout !== undefined) {
      return timeoutPromise<boolean>(openPromise, timeout);
    } else {
      return openPromise;
    }
  }

  async close(timedout?: number): Promise<boolean> {
    const p = new Promise<boolean>((resolve, reject) => {
      if (this.port === undefined) {
        resolve(true);
        return;
      }
      this.port.close((err) => {
        if (err !== null) {
          if (err.message.includes('Port is not open')) {
            this.logger.info(`Port was already closed`);
            resolve(true);
          } else {
            this.logger.error(`Error closing serial port: ${err.message}`);
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });

    if (timedout === undefined) {
      return await p;
    } else {
      return await timeoutPromise(p, timedout);
    }
  }
}
