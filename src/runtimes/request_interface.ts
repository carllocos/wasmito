import { type Channel } from '../communication/channel_interface';
import { RequestsManager } from '../communication/requests_manager';
import { errorCodeToMessage } from './error_codes';
import {
  getInstructionFromString,
  type Instruction,
} from './wasmito_vm/requests/instructions';

export enum SubscriptionParseOutcome {
  Successful,
  Failed,
}

export class APIRequestInvalidParse extends Error {}

export abstract class APIRequest<R> {
  abstract description(): string;
  abstract getData(): string;
  abstract parse(input: string): R;
  abstract handleSubscriptionData(data: string): SubscriptionParseOutcome;
  abstract isSubscriptionClosed(): boolean;
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
