/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Channel } from '../../src/communication/channel_interface';

export class MockSerialConnection implements Channel {
  private callbacks: Array<(data: string) => void>;
  readonly channelName: string;

  constructor(port: string, baudrate: number) {
    this.callbacks = [];
    this.channelName = 'mockChannel';
  }

  async write(
    data: any,
    cb?: ((err?: Error | null | undefined) => void) | undefined,
  ): Promise<boolean> {
    return true;
  }

  addOnWriteListener(callback: (data: string | Uint8Array) => void): void {
    throw new Error('to implement');
  }

  removeOnWriteListener(callback: (data: string | Uint8Array) => void): void {
    throw new Error('to implement');
  }

  async open(timeout?: number): Promise<boolean> {
    return true;
  }

  async close(timedout?: number): Promise<boolean> {
    return true;
  }

  async send(data: string): Promise<boolean> {
    return true;
  }

  addOnData(callback: (data: string) => void): void {
    this.callbacks.push(callback);
  }

  removeOnData(callback: (data: string) => void): void {
    this.callbacks = this.callbacks.filter((c) => c !== callback);
  }

  triggerData(data: string): void {
    this.callbacks.forEach((cb) => {
      cb(data);
    });
  }
}
