/* eslint-disable @typescript-eslint/no-unused-vars */
import { type Channel } from '../../src/communication';

export class MockChannel implements Channel {
  readonly channelName: string = 'MockChannel';
  private dataHandler?: (data: string) => void;
  private mockWriteHandler?: (data: any) => boolean;

  addMockWriteMethod(cb: (data: any) => boolean): void {
    this.mockWriteHandler = cb;
  }

  mockOnData(data: string): void {
    if (this.dataHandler === undefined) {
      throw Error('No dataHanlder for mocked data');
    }
    this.dataHandler(data);
  }

  write(
    data: any,
    cb?: ((err?: Error | null | undefined) => void) | undefined,
  ): boolean {
    if (this.mockWriteHandler === undefined) {
      throw Error('No mock for write registered');
    }
    return this.mockWriteHandler(data);
  }

  async open(timeout?: number | undefined): Promise<boolean> {
    throw Error(
      'NoChannel has no implementation and serves only as transition channel',
    );
  }

  async close(timedout?: number): Promise<boolean> {
    throw Error(
      'NoChannel has no implementation and serves only as transition channel',
    );
  }

  async send(data: string): Promise<boolean> {
    throw Error(
      'NoChannel has no implementation and serves only as transition channel',
    );
  }

  addOnData(callback: (data: string) => void): void {
    if (this.dataHandler === undefined) {
      this.dataHandler = callback;
    } else {
      throw Error('already one handler registered');
    }
  }

  removeOnData(callback: (data: string) => void): void {
    throw Error(
      'NoChannel has no implementation and serves only as transition channel',
    );
  }
}
