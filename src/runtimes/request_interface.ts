import { type Channel } from '../communication/channel_interface';
import { IDGenerator, RequestID } from '../communication/id_generator';
import {
  CommandError,
  RequestsManager,
} from '../communication/requests_manager';
import { createLogger } from '../logger/logger';
import {
  isSubscriptionMessage,
  RequestMessage,
  SubscribeResponse,
} from './request_msg';
import { type Instruction } from './wasmito_vm/requests/instructions';

const logger = createLogger('RequestManager');

export enum SubscriptionParseOutcome {
  Successful,
  Failed,
}

export class APIRequestInvalidParse extends Error {}
const idGenerator = new IDGenerator();

export abstract class APIRequest<R> {
  public readonly id: RequestID;
  abstract readonly instruction: Instruction;
  private _response: RequestMessage | undefined;
  private _parsed: R | undefined;

  private _resolved: boolean;
  private _rejected: boolean;
  public promise: any;
  private resolver: ((value: R | PromiseLike<R>) => void) | undefined;
  private rejector: ((reason?: any) => void) | undefined;

  private cb?: () => void;

  constructor() {
    this.id = idGenerator.newID();
    this.promise = new Promise((resolve, reject) => {
      this.resolver = resolve;
      this.rejector = reject;
    });

    this._resolved = false;
    this._rejected = false;
  }

  abstract description(): string;
  abstract getData(): string;
  abstract parse(input: string): R; // TODO remove
  abstract processAck(ack: RequestMessage): R;
  abstract processSubscriptionData(
    sub: SubscribeResponse,
  ): Promise<SubscriptionParseOutcome>;

  abstract isSubscriptionClosed(): boolean;

  serializeID(): string {
    return idGenerator.serialiseIDToLEBHex(this.id);
  }

  get responseMessage(): RequestMessage {
    if (this._response === undefined) {
      throw new Error(`Request has not been send`);
    }
    return this._response;
  }

  get responseContent(): R {
    if (this._parsed === undefined) {
      throw new Error(`request has no response content`);
    }
    return this._parsed;
  }

  hasResponse(): boolean {
    return this._response !== undefined;
  }

  registerTimeout(timeoutMs?: number) {
    // TODO use timeout
    if (timeoutMs !== undefined) {
      setTimeout(() => {
        this.timedout(timeoutMs);
      }, timeoutMs);
    }
  }

  isResolved(): boolean {
    return this._rejected || this._resolved;
  }

  timedout(timeoutMs: number): void {
    if (!this._rejected && !this._resolved) {
      const errMsg = `Request ${this.description()} timedout after ${
        timeoutMs
      } ms while waiting for reply`;
      logger.error(errMsg);
      this.requestRejector(new CommandError(errMsg));
    }
  }

  async processRequestMessage(
    msg: RequestMessage,
  ): Promise<SubscriptionParseOutcome> {
    if (this._rejected) return SubscriptionParseOutcome.Failed;

    if (this._resolved) {
      if (isSubscriptionMessage(msg)) {
        // case we may feed data to a subscription
        // if(this.isSubscriptionClosed()){}
        return await this.processSubscriptionData(msg);
      }
      return SubscriptionParseOutcome.Failed;
    } else {
      return this.processRequestAck(msg);
    }
  }

  private processRequestAck(msg: RequestMessage): SubscriptionParseOutcome {
    try {
      const parsed = this.processAck(msg);
      this._response = msg;
      this._parsed = parsed;
      this.requestResolver(parsed);
      return SubscriptionParseOutcome.Successful;
    } catch (_err) {
      return SubscriptionParseOutcome.Failed;
    }
  }

  private requestResolver(v: R): void {
    if (!this._resolved && !this._rejected) {
      this._resolved = true;
      if (this.cb !== undefined) {
        this.cb();
      }
      this.resolver!(v);
    }
  }

  private requestRejector(v?: any): void {
    if (!this._resolved && !this._rejected) {
      this._rejected = true;
      this.rejector!(v);
    }
  }
}

export abstract class APIRequestNoSubscription<R> extends APIRequest<R> {
  override isSubscriptionClosed(): boolean {
    return true;
  }

  override async processSubscriptionData(
    _sub: SubscribeResponse,
  ): Promise<SubscriptionParseOutcome> {
    throw new Error(
      `No subscription supported in request '${this.description()}'`,
    );
  }
}

export async function sendRequest<T>(
  channel: Channel,
  request: APIRequest<T>,
  timeout?: number,
): Promise<T> {
  const m = new RequestsManager();
  return m.sendRequest(channel, request, timeout);
}
