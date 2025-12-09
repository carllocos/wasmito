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

export enum ResponseType {
  SuccessResponse = '01',
  ErrorResponse = '02',
  SubscriptionResponse = '03',
}

export function getResponseTypeFromString(
  str: string,
): ResponseType | undefined {
  switch (str) {
    case '01':
      return ResponseType.SuccessResponse;
    case '02':
      return ResponseType.ErrorResponse;
    case '03':
      return ResponseType.SubscriptionResponse;
    default:
      return undefined;
  }
}

export interface ResponseJSONMessage {
  interrupt: string;
  kind: string;
  error_code?: string;
  sub?: any;
}

export interface RequestMessage {
  interrupt: Instruction;
  responseType: ResponseType;
  error_code?: number;
  error_msg?: string;
  sub?: any;
}

export function isSuccessfulMessage(reply: RequestMessage): boolean {
  return reply.responseType === ResponseType.SuccessResponse;
}

export function isSubscriptionMessage(msg: RequestMessage): boolean {
  return (
    msg.responseType === ResponseType.SubscriptionResponse &&
    msg.sub !== undefined &&
    msg.error_code === undefined &&
    msg.error_msg === undefined
  );
}

function createMessageFromJSON(content: any): RequestMessage | undefined {
  let obj: ResponseJSONMessage | undefined;
  if (typeof content === 'string') {
    try {
      obj = JSON.parse(content);
    } catch (_e) {
      return undefined;
    }
  }
  if (obj === undefined) {
    return undefined;
  }
  const instr = getInstructionFromString(obj.interrupt);
  const responseType = getResponseTypeFromString(obj.kind);
  if (instr === undefined || responseType === undefined) {
    return undefined;
  }

  const response: RequestMessage = {
    interrupt: instr,
    responseType,
  };

  if (obj.error_code !== undefined) {
    const errorCode = parseInt(obj.error_code);
    if (
      isNaN(errorCode) ||
      response.responseType !== ResponseType.ErrorResponse
    ) {
      return undefined;
    }
    response.error_code = errorCode;
    response.error_msg = errorCodeToMessage(errorCode);
    return response;
  } else if (obj.sub !== undefined) {
    if (responseType !== ResponseType.SubscriptionResponse) {
      return undefined;
    }
    response.sub = obj.sub;
    return response;
  } else if (responseType === ResponseType.SuccessResponse) {
    return response;
  }
  return undefined;
}

export function createRequestMessage(obj: any): RequestMessage | undefined {
  return createMessageFromJSON(obj);
}

export async function sendRequest<T>(
  channel: Channel,
  request: APIRequest<T>,
  timeout?: number,
): Promise<T> {
  const m = new RequestsManager();
  return m.sendRequest(channel, request, timeout);
}
