import { SerialPort } from 'serialport';
import { type Channel } from './channel_interface';
import { createLogger } from '../logger/logger';
import { timeoutPromise } from '../util/promise_util';
import type winston from 'winston';

// TODO remove code duplication from client-side socket

export class SerialConnection implements Channel {
  private port?: SerialPort;
  private readonly portName: string;
  private readonly baudRate: number;
  private callbacks: Array<(data: string) => void> = [];
  private dataBuffered: string = '';
  private readonly logger: winston.Logger;

  constructor(portName: string, baudRate: number) {
    this.portName = portName;
    this.baudRate = baudRate;
    this.logger = createLogger(this.portName);
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
  }

  private handleLines(lines: string[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.callbacks.forEach((cb) => {
        cb(line);
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
      this.logger.debug(line);
      lines.push(line);
      idx = this.dataBuffered.indexOf('\n');
    }
    return lines;
  }

  async send(data: string): Promise<boolean> {
    return await new Promise<boolean>((resolve, reject) => {
      if (this.port === undefined) {
        reject(new Error('Serial port is not open.'));
      } else if (!this.port.isOpen) {
        reject(new Error('Serial port is not open.'));
      } else {
        this.port.write(data, (err) => {
          if (err === undefined) {
            resolve(true);
          } else {
            reject(new Error(`Error sending data: ${err?.message}`));
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
      return await timeoutPromise<boolean>(openPromise, timeout);
    } else {
      return await openPromise;
    }
  }

  async close(): Promise<boolean> {
    return await new Promise<boolean>((resolve, reject) => {
      if (this.port === undefined) {
        resolve(true);
        return;
      }
      this.port.close((err) => {
        if (err !== null) {
          console.error(`Error closing serial port: ${err.message}`);
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
}
