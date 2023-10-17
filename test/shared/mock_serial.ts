import type { Channel } from '../../src/communication/channel_interface';

export class MockSerialConnection implements Channel {
  private callbacks: Array<(data: string) => void>;

  constructor(port: string, baudrate: number) {
    this.callbacks = [];
  }

  async open(timedout: number): Promise<boolean> {
    return true;
  }

  async close(): Promise<boolean> {
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
