import type * as net from 'net';
import { type Channel } from './channel_interface';
import { createLogger, Logger } from '../logger/logger';

export abstract class AbstractChannel implements Channel {
  readonly channelName: string;
  protected connection?: net.Socket;
  private dataBuffered: string = '';
  private listeners: Array<(data: string) => void>;
  private readonly removedListeners: Set<(data: string) => void>;
  protected logger: Logger;

  constructor(channelName: string) {
    this.channelName = channelName;
    this.listeners = [];
    this.removedListeners = new Set();
    this.logger = createLogger(this.channelName);
  }

  // Abstract methods
  public abstract write(
    data: any,
    cb?: ((err?: Error | null | undefined) => void) | undefined,
  ): boolean;

  public abstract open(timeout?: number): Promise<boolean>;

  public abstract close(timeout?: number): Promise<boolean>;

  public abstract send(data: string): Promise<boolean>;

  public addOnData(callback: (data: string) => void): void {
    this.listeners.push(callback);
  }

  public removeOnData(callback: (data: string) => void): void {
    this.removedListeners.add(callback);
  }

  protected onDataHandler(data: Buffer): void {
    this.dataBuffered += data.toString();
    this.handleLines(this.parseLines());
    this.listeners = this.listeners.filter((cb) => {
      return !this.removedListeners.has(cb);
    });
    this.removedListeners.clear();
  }

  private handleLines(lines: string[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.listeners.forEach((listener) => {
        if (!this.removedListeners.has(listener)) {
          listener(line);
        }
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
}
