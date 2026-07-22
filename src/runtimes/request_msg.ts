import { getGlobalLogger } from '../logger/logger';
import {
  decodeLEB128,
  hexStringToUint8Array,
  isHexaString,
} from '../util/decoder';
import { errorCodeToMessage } from './error_codes';
import {
  getInstructionFromString,
  Instruction,
} from './wasmito_vm/requests/instructions';
import { getExceptionMsgFromErrorCode } from './wasmito_vm/requests/request_error_code';

const logger = getGlobalLogger();

export enum ResponseType {
  SuccessResponse = '01',
  ErrorResponse = '02',
  SubscriptionResponse = '03',
}

export function getResponseTypeFromString(
  str: string,
): ResponseType | undefined {
  const enumValues: string[] = Object.values(ResponseType);
  if (enumValues.includes(str)) {
    return str as ResponseType;
  }
}

export interface ResponseJSONMessage {
  id: string;
  interrupt: string;
  kind: string;
  error_code?: string;
  sub?: any;
  reply?: any;
}

export interface RequestMessage {
  id: number;
  interrupt: Instruction;
  responseType: ResponseType;
  error_code?: number;
  error_msg?: string;
  sub?: any;
}

export interface SuccessResponse extends RequestMessage {
  error_code: undefined;
  error_msg: undefined;
  responseType: ResponseType.SuccessResponse;
}

export interface ErrorResponse extends RequestMessage {
  error_code: number;
  error_msg: string;
  responseType: ResponseType.ErrorResponse;
}

export interface SubscribeResponse extends RequestMessage {
  error_code: undefined;
  error_msg: undefined;
  responseType: ResponseType.SubscriptionResponse;
  sub: any;
}

export function isRequestMessage(
  msg: any,
  instruction?: Instruction,
): msg is RequestMessage {
  return (
    typeof msg === 'object' &&
    typeof msg.id === 'number' &&
    (msg.responseType === ResponseType.SubscriptionResponse ||
      msg.responseType === ResponseType.ErrorResponse ||
      msg.responseType === ResponseType.SuccessResponse) &&
    (msg.error_code === undefined || typeof msg.error_code === 'number') &&
    (msg.error_msg === undefined || typeof msg.error_msg === 'string') &&
    (instruction === undefined || instruction === msg.interrupt)
  );
}

export function isSuccessfulMessage(
  reply: any,
  instruction?: Instruction,
): reply is SuccessResponse {
  return (
    isRequestMessage(reply, instruction) &&
    reply.responseType === ResponseType.SuccessResponse &&
    reply.error_code === undefined &&
    reply.error_msg === undefined
  );
}

export function isErrorMessage(
  reply: any,
  instruction?: Instruction,
): reply is ErrorResponse {
  return (
    isRequestMessage(reply, instruction) &&
    reply.responseType === ResponseType.ErrorResponse &&
    reply.error_code !== undefined &&
    reply.error_msg !== undefined
  );
}

export function isSubscriptionMessage(
  msg: any,
  instruction?: Instruction,
): msg is RequestMessage {
  return (
    isRequestMessage(msg, instruction) &&
    msg.responseType === ResponseType.SubscriptionResponse &&
    msg.sub !== undefined &&
    msg.error_code === undefined &&
    msg.error_msg === undefined
  );
}

export function createRequestMessage(content: any): RequestMessage | undefined {
  const msg: undefined | RequestMessage = createMessageFromJSON(content);
  if (msg !== undefined) return msg;
  return createMessageFromHexaString(content);
}

function createMessageFromJSON(content: any): RequestMessage | undefined {
  let obj;
  if (typeof content === 'string') {
    try {
      obj = JSON.parse(content);
    } catch (_e) {
      return undefined;
    }
  }

  if (obj === undefined || typeof obj !== 'object') return undefined;

  const instr = getInstructionFromString(obj.interrupt);
  const responseType = getResponseTypeFromString(obj.kind);
  const id = parseInt(obj.id ?? obj.i, 16); // TODO fix error in serial that drops the d of id
  if (
    instr === undefined ||
    responseType === undefined ||
    id === undefined ||
    typeof id !== 'number' ||
    isNaN(id)
  ) {
    if (id === undefined || isNaN(id)) {
      const errMsg = `JSON response arrived without (valid) ID. Response: ${JSON.stringify(obj)}`;
      logger.error(errMsg);
      throw new Error(errMsg);
    }
    return undefined;
  }

  const response: RequestMessage = {
    id: id,
    interrupt: instr,
    responseType,
  };

  if (obj.error_code !== undefined) {
    const errorCode = parseInt(obj.error_code);
    if (
      isNaN(errorCode) ||
      response.responseType !== ResponseType.ErrorResponse
    ) {
      logger.error(
        `Got a reply with error code but has no valid error code or response type: ${JSON.stringify(obj)}`,
      );
      return undefined;
    }
    response.error_code = errorCode;
    response.error_msg = errorCodeToMessage(errorCode);
    return response;
  }

  response.sub = obj.sub ?? obj.reply; // todo fix field
  return response;
}

function createMessageFromHexaString(
  hexaInput: string,
): RequestMessage | undefined {
  // TODO parse hexa string and convert to json object
  // format: header | response type | id | optional body 1
  // header: Interrupt Nr (2 chars hexa) |
  // response_type : 2 chars hexa
  // id: several chars LEB encoding
  // body1 only if response type is error: error code (2 chars hexa)

  if (!isHexaString(hexaInput)) {
    // no regex string
    return undefined;
  }

  if (hexaInput.length < 5) {
    return undefined;
  }

  let idx = 2;
  const interrupt = getInstructionFromString(hexaInput.slice(0, idx));
  if (interrupt === undefined) return undefined;

  const responseType = getResponseTypeFromString(hexaInput.slice(idx, idx + 2));
  if (responseType === undefined) return undefined;
  idx += 2;

  const hexString = hexaInput.slice(idx, hexaInput.length);
  const buff = hexStringToUint8Array(hexString);
  if (buff === undefined) return undefined;

  const decoded = decodeLEB128(buff);
  if (decoded === undefined) return undefined;

  const response: RequestMessage = {
    id: decoded.value,
    interrupt,
    responseType,
  };

  idx = idx + decoded.bytesRead * 2;
  if (responseType === ResponseType.ErrorResponse) {
    const errorCodeHexa = hexaInput.slice(idx, idx + 2);
    idx += 2;
    response.error_code = parseInt(errorCodeHexa, 16);
    if (isNaN(response.error_code)) {
      logger.error(
        `Error response received a non hexa errorCode. Given '${errorCodeHexa}'. Full message '${hexaInput}'`,
      );
      return undefined;
    }

    response.error_msg = getExceptionMsgFromErrorCode(response.error_code);
    if (response.error_msg === undefined) {
      logger.error(
        `No error message registered for errorCode ${response.error_code}`,
      );
    }
  }

  const rest = hexaInput.slice(idx, hexaInput.length);
  if (rest.length > 0) {
    response.sub = rest;
    // // TODO parse sub content if reply provided some
    // const errMsg = `a part of the VM message still needs to be parsed: ${rest}`;
    // logger.error(errMsg);
    // throw new Error(errMsg);
  }
  return response;
}
