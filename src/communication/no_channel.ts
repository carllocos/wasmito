/* eslint-disable @typescript-eslint/no-unused-vars */
import { type Channel } from './channel_interface';

/*
 * NoChannel is a class that throws errors for each member of the Channel interface.
 * The class is only used as a temporary channel and is meant to be replaced with another channel
 * where the other channel represents a real connection.
 * In some cases, a VM has no channel yet and therefore NoChannel makes the transition to a real channel easier.
 */

export class NoChannel implements Channel {
  readonly channelName: string = 'NoChannel';

  write(
    data: any,
    cb?: ((err?: Error | null | undefined) => void) | undefined,
  ): boolean {
    throw Error(
      'NoChannel has no implementation and serves only as transition channel',
    );
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
    throw Error(
      'NoChannel has no implementation and serves only as transition channel',
    );
  }

  removeOnData(callback: (data: string) => void): void {
    throw Error(
      'NoChannel has no implementation and serves only as transition channel',
    );
  }
}
