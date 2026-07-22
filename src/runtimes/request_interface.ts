import { type Channel } from '../communication/channel_interface';
import { IDGenerator, RequestID } from '../communication/id_generator';
import { RequestsManager } from '../communication/requests_manager';
import { RequestMessage } from './request_msg';
import { type Instruction } from './wasmito_vm/requests/instructions';

export enum SubscriptionParseOutcome {
  Successful,
  Failed,
}

export class APIRequestInvalidParse extends Error {}
const idGenerator = new IDGenerator();

export abstract class APIRequest<R> {
  public readonly id: RequestID;
  abstract readonly instruction: Instruction;
  constructor() {
    this.id = idGenerator.newID();
  }
  abstract description(): string;
  abstract getData(): string;
  abstract parse(input: string): R; // TODO remove
  abstract processAck(ack: RequestMessage): R;
  abstract processSubscriptionData(
    sub: RequestMessage,
  ): Promise<SubscriptionParseOutcome>;
  abstract isSubscriptionClosed(): boolean;
  serializeID(): string {
    return idGenerator.serialiseIDToLEBHex(this.id);
  }
}

export abstract class APIRequestNoSubscription<R> extends APIRequest<R> {
  override handleSubscriptionData(_data: string): SubscriptionParseOutcome {
    return SubscriptionParseOutcome.Failed;
  }
  override isSubscriptionClosed(): boolean {
    return true;
  }
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
