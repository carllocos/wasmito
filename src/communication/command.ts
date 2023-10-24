import { getGlobalLogger } from '../logger/logger';
import { type APIRequest } from '../warduino/api/request_interface';
import { type Channel } from './channel_interface';

export class Command<T> {
  private readonly connection: Channel;
  private readonly request: APIRequest<T>;
  private requestResolver: ((v: T) => void) | undefined;
  private requestRejector: ((v?: any) => void) | undefined;
  private resolved: boolean;
  private rejected: boolean;
  private readonly onDataListener: (data: string) => void;
  private readonly timeout: number | undefined;

  constructor(connection: Channel, request: APIRequest<T>, timeout?: number) {
    this.connection = connection;
    this.request = request;
    this.resolved = false;
    this.rejected = false;
    this.onDataListener = (data: string) => {
      if (this.resolved || this.rejected) {
        if (this.request.handleSubscriptionData === undefined) {
          this.connection.removeOnData(this.onDataListener);
        } else {
          this.request.handleSubscriptionData(data);
        }
      } else {
        this.update(data);
      }
    };
    this.timeout = timeout;
  }

  update(data: string): void {
    try {
      if (this.requestResolver !== undefined) {
        const parsed = this.request.parse(data);
        this.requestResolver(parsed);
      }
    } catch (err) {}
  }

  timedout(): void {
    if (this.requestRejector !== undefined && this.timeout !== undefined) {
      const errMsg = `Command timedout after ${this.timeout} ms while waiting for reply`;
      getGlobalLogger().error(errMsg);
      this.requestRejector(new CommandError(errMsg));
    }
  }

  async execute(): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      this.requestResolver = (v: T) => {
        if (!this.resolved && !this.rejected) {
          this.resolved = true;
          resolve(v);
        }
      };
      this.requestRejector = (v?: any) => {
        if (!this.resolved && !this.rejected) {
          this.rejected = true;
          reject(v);
        }
      };
      const d = this.request.getData();
      this.connection.addOnData(this.onDataListener);
      this.connection
        .send(d)
        .then((successful) => {
          if (successful) {
            if (this.timeout !== undefined) {
              setTimeout(() => {
                this.timedout();
              }, this.timeout);
            }
          } else {
            this.requestRejector?.(
              new CommandError('could not send content to channel'),
            );
          }
        })
        .catch((v) => {
          this.requestRejector?.(v);
        });
    });
  }
}

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
    Error.captureStackTrace(this, CommandError);
  }
}
