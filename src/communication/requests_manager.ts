import { getGlobalLogger } from '../logger/logger';
import {
  SubscriptionParseOutcome,
  type APIRequest,
} from '../runtimes/request_interface';
import { type Channel } from './channel_interface';

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
    Error.captureStackTrace(this, CommandError);
  }
}

class SendRequest<T> {
  public readonly request: APIRequest<T>;
  private _resolved: boolean;
  private _rejected: boolean;
  private readonly resolver: any;
  private readonly rejector: any;

  constructor(request: APIRequest<T>, resolver: any, rejector: any) {
    this.request = request;
    this._resolved = false;
    this._rejected = false;
    this.resolver = resolver;
    this.rejector = rejector;
  }

  private requestResolver(v: T): void {
    if (!this.resolved && !this.rejected) {
      this._resolved = true;
      this.resolver(v);
    }
  }

  private requestRejector(v?: any): void {
    if (!this.resolved && !this.rejected) {
      this._rejected = true;
      this.rejector(v);
    }
  }

  get resolved(): boolean {
    return this._resolved;
  }

  get rejected(): boolean {
    return this._rejected;
  }

  async send(connection: Channel, timeoutMs?: number): Promise<void> {
    try {
      const d = this.request.getData();
      const successful = await connection.send(d);
      if (!successful) {
        this.requestRejector(
          new CommandError('could not send content to channel'),
        );
        return;
      }

      if (timeoutMs !== undefined) {
        setTimeout(() => {
          this.timedout(timeoutMs);
        }, timeoutMs);
      }
    } catch (e) {
      this.requestRejector(e);
    }
  }

  completed(): boolean {
    return (
      this.rejected || (this.resolved && this.request.isSubscriptionClosed())
    );
  }

  timedout(timeoutMs: number): void {
    if (!this.rejected && !this.resolved) {
      const errMsg = `Request ${this.request.description()} timedout after ${
        timeoutMs
      } ms while waiting for reply`;
      getGlobalLogger().error(errMsg);
      this.requestRejector(new CommandError(errMsg));
    }
  }

  processNewData(data: string): SubscriptionParseOutcome {
    // case we may feed data to a subscription
    if (this.rejected) return SubscriptionParseOutcome.Failed;

    if (this.resolved) {
      return this.processSubscriptionData(data);
    } else {
      return this.processRequestAck(data);
    }
  }

  private processRequestAck(data: string): SubscriptionParseOutcome {
    try {
      const parsed = this.request.parse(data);
      this.requestResolver(parsed);
      return SubscriptionParseOutcome.Successful;
    } catch (_err) {
      return SubscriptionParseOutcome.Failed;
    }
  }

  private processSubscriptionData(data: string): SubscriptionParseOutcome {
    if (this.request.isSubscriptionClosed())
      return SubscriptionParseOutcome.Failed;
    return this.request.handleSubscriptionData(data);
  }
}

export class RequestsManager {
  private connection?: Channel;
  private requests: Array<SendRequest<any>>;

  constructor() {
    this.requests = [];
  }

  onRequestData(data: string): void {
    // remove completed requests
    this.requests = this.requests.filter((req) => !req.completed());
    if (this.requests.length === 0) {
      this.connection?.removeOnData(this.onRequestData.bind(this));
      return;
    }

    for (const req of this.requests) {
      const dataProcessed = req.processNewData(data);
      if (dataProcessed === SubscriptionParseOutcome.Successful) break;
    }
    return;
  }

  async sendRequest<T>(
    connection: Channel,
    request: APIRequest<T>,
    timeoutMs?: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.connection = connection;
      const req = new SendRequest(request, resolve, reject);
      if (this.requests.length == 0) {
        this.connection.addOnData(this.onRequestData.bind(this));
      }
      this.requests.push(req);
      req.send(this.connection, timeoutMs);
    });
  }
}
