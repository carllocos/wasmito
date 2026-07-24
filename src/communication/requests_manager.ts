import { createLogger } from '../logger/logger';
import {
  SubscriptionParseOutcome,
  type APIRequest,
} from '../runtimes/request_interface';
import { type Channel } from './channel_interface';
import { RequestID } from './id_generator';
import { createRequestMessage, RequestMessage } from '../runtimes/request_msg';

const logger = createLogger('RequestManager');

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
  private resolver: ((value: T | PromiseLike<T>) => void) | undefined;
  private rejector: any;

  private cb?: () => void;
  private _promisesResolved: Map<RequestID, SendRequest<any>>;

  constructor(
    request: APIRequest<T>,
    promisesResolved: Map<RequestID, SendRequest<any>>,
    resolver?: (value: T | PromiseLike<T>) => void,
    rejector?: any,
  ) {
    this.request = request;
    this._resolved = false;
    this._rejected = false;
    this._promisesResolved = promisesResolved;
    this.resolver = resolver;
    this.rejector = rejector;
  }

  private requestResolver(v: T): void {
    if (!this.resolved && !this.rejected) {
      this._resolved = true;
      if (this.cb !== undefined) {
        this.cb();
      }
      if (this.completed()) this._promisesResolved.delete(this.request.id);

      this.resolver!(v);
    }
  }

  private requestRejector(v?: any): void {
    if (!this.resolved && !this.rejected) {
      this._rejected = true;
      if (this.completed()) this._promisesResolved.delete(this.request.id);
      this.rejector(v);
    }
  }

  get resolved(): boolean {
    return this._resolved;
  }

  get rejected(): boolean {
    return this._rejected;
  }

  registerTimeout(timeoutMs?: number) {
    // TODO use timeout
    if (timeoutMs !== undefined) {
      setTimeout(() => {
        this.timedout(timeoutMs);
      }, timeoutMs);
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
      logger.error(errMsg);
      this.requestRejector(new CommandError(errMsg));
    }
  }

  async processNewData(msg: RequestMessage): Promise<SubscriptionParseOutcome> {
    if (this.rejected) return SubscriptionParseOutcome.Failed;

    if (this.resolved) {
      // case we may feed data to a subscription
      return await this.processSubscriptionData(msg);
    } else {
      return this.processRequestAck(msg);
    }
  }

  private processRequestAck(ack: RequestMessage): SubscriptionParseOutcome {
    try {
      const parsed = this.request.processAck(ack);
      this.requestResolver(parsed);
      return SubscriptionParseOutcome.Successful;
    } catch (_err) {
      return SubscriptionParseOutcome.Failed;
    }
  }

  private async processSubscriptionData(
    data: RequestMessage,
  ): Promise<SubscriptionParseOutcome> {
    if (this.request.isSubscriptionClosed())
      return SubscriptionParseOutcome.Failed;
    return await this.request.processSubscriptionData(data);
  }

  setResolvers(resolve: any, reject: any) {
    this.resolver = resolve;
    this.rejector = reject;
  }
}

export class RequestsManager {
  private connection?: Channel;
  private requests: Map<RequestID, SendRequest<any>>;

  constructor() {
    this.requests = new Map<RequestID, SendRequest<any>>();
  }

  async onRequestData(data: string): Promise<void> {
    const msg = createRequestMessage(data);
    if (msg === undefined) return;

    const req = this.requests.get(msg.id);
    if (req === undefined) {
      throw new Error(
        `No request handler registered for response with id '${msg.id}'. Response: ${data}`,
      );
    }

    await req.processNewData(msg);
    if (this.requests.size === 0) {
      // TODO fix remove bug
      this.connection?.removeOnData(this.onRequestData.bind(this));
    }
    return;
  }

  async sendRequest<T>(
    connection: Channel,
    request: APIRequest<T>,
    timeoutMs: number | undefined = undefined, // TODO handle timeouts
    bulkRequests: boolean = true,
  ): Promise<T> {
    const response = await this.sendRequests(
      connection,
      [request],
      bulkRequests,
      timeoutMs,
    );
    return response[0];
  }

  async sendRequests<T>(
    connection: Channel,
    requests: Array<APIRequest<T>>,
    bulkRequests: boolean,
    _timeoutMs?: number,
  ): Promise<Array<T>> {
    if (bulkRequests) {
      return await this.sendInBulk(connection, requests, _timeoutMs);
    } else {
      return await this.sendInSequence(connection, requests, _timeoutMs);
    }
  }

  private async sendInBulk<T>(
    connection: Channel,
    requests: Array<APIRequest<T>>,
    _timeoutMs?: number,
  ): Promise<Array<T>> {
    this.connection = connection;
    const promises: Promise<T>[] = [];

    if (this.requests.size === 0)
      this.connection.addOnData(this.onRequestData.bind(this));

    let data = '';
    for (const request of requests) {
      data += request.getData();
      if (this.requests.has(request.id)) {
        const oldReq = this.requests.get(request.id)!;
        throw new Error(
          `two requests send with identical id '${request.id}'.\nOld Request: '${oldReq.request.description()}'\nCurrent Request:'${request.description()}'`,
        );
      }

      const p = new Promise<T>((resolve, reject) => {
        const req = new SendRequest(request, this.requests, resolve, reject);
        this.requests.set(request.id, req);
      });
      promises.push(p);
    }

    const successful = await connection.send(data);
    if (!successful) {
      throw new CommandError(
        `could not send content of multiple requests to channel. Content: '${data}'`,
      );
    }

    return Promise.all(promises);
  }

  async sendInSequence<T>(
    connection: Channel,
    requests: Array<APIRequest<T>>,
    _timeoutMs?: number,
  ) {
    this.connection = connection;
    const results: T[] = [];

    if (this.requests.size === 0)
      this.connection.addOnData(this.onRequestData.bind(this));

    for (const request of requests) {
      const data = request.getData();
      if (this.requests.has(request.id)) {
        const oldReq = this.requests.get(request.id)!;
        throw new Error(
          `two requests send with identical id '${request.id}'.\nOld Request: '${oldReq.request.description()}'\nCurrent Request:'${request.description()}'`,
        );
      }

      const req = new SendRequest(request, this.requests);
      const p = new Promise<T>((resolve, reject) => {
        req.setResolvers(resolve, reject);
      });
      this.requests.set(request.id, req);
      const successful = await connection.send(data);
      if (!successful) {
        throw new CommandError(
          `could not send content of multiple requests to channel. Content: '${data}'`,
        );
      }
      const t = await p;
      results.push(t);
    }

    return results;
  }
}
