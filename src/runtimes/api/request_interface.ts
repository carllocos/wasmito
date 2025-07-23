import { type Channel } from '../../communication/channel_interface';
import { Command } from '../../communication/command';
import { getInstructionFromString, type Instruction } from './instructions';

export class APIRequestInvalidParse extends Error {}

export abstract class APIRequest<R> {
  abstract description(): string;
  abstract getData(): string;
  abstract parse(input: string): R;
  abstract handleSubscriptionData(data: string): void;
  abstract isSubscriptionClosed(): boolean;
}

export abstract class APIRequestNoSubscription<R> extends APIRequest<R> {
  override handleSubscriptionData(data: string): void {}
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
  sub?: any;
}

export function isSuccessfulMessage(reply: RequestMessage): boolean {
  return reply.responseType === ResponseType.SuccessResponse;
}

export function isSubscriptionMessage(msg: RequestMessage): boolean {
  return (
    msg.responseType === ResponseType.SubscriptionResponse &&
    msg.sub !== undefined &&
    msg.error_code === undefined
  );
}

function createMessageFromJSON(content: any): RequestMessage | undefined {
  let obj: ResponseJSONMessage | undefined;
  if (typeof content === 'string') {
    try {
      obj = JSON.parse(content);
    } catch (e) {
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
      !isNaN(errorCode) ||
      response.responseType !== ResponseType.ErrorResponse
    ) {
      return undefined;
    }
    response.error_code = errorCode;
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
  const command = new Command(channel, request, timeout);
  return command.execute();
}
