import { getGlobalLogger } from '../../logger/logger';
import { encodeLEB128ToHex } from '../../util/encoder';
import {
  type APIRequest,
  APIRequestInvalidParse,
} from '../api/request_interface';
import { Instruction, getInstructionFromString } from '../api/instructions';
import { type InstrumentHook } from '../../instrumentor/hook';

export interface AroundFunctionJSONResponse {
  interrupt: string;
  kind: string;
  error_code?: string;
}
export enum ResponseType {
  SuccessResponse = '01',
  ErrorResponse = '02',
}

function getResponseTypeFromString(str: string): ResponseType | undefined {
  switch (str) {
    case '01':
      return ResponseType.SuccessResponse;
    case '02':
      return ResponseType.ErrorResponse;
    default:
      return undefined;
  }
}

export interface AroundHookResponse {
  interrupt: Instruction;
  responseType: ResponseType;
  error_code?: number;
}

export function createAroundFunctionResponse(
  obj: AroundFunctionJSONResponse,
): AroundHookResponse | undefined {
  const instr = getInstructionFromString(obj.interrupt);
  const responseType = getResponseTypeFromString(obj.kind);
  if (
    instr === undefined ||
    responseType === undefined ||
    instr !== Instruction.AroundFunction
  ) {
    return undefined;
  }

  const reply: AroundHookResponse = {
    interrupt: instr,
    responseType,
  };
  if (obj.error_code !== undefined) {
    const code = parseInt(obj.error_code);
    if (!isNaN(code)) {
      return undefined;
    }
    reply.error_code = code;
  }

  return reply;
}
export function isSuccessfulReply(reply: AroundHookResponse): boolean {
  return reply.responseType === ResponseType.SuccessResponse;
}

export function isAroundFunctionJSONResponse(
  content: any,
): content is AroundFunctionJSONResponse {
  const validFields =
    typeof content === 'object' &&
    typeof content.interrupt === 'string' &&
    typeof content.kind === 'string' &&
    (typeof content.error_code === 'string' ||
      content.error_code === undefined);
  if (validFields) {
    return content.interrupt === Instruction.AroundFunction;
  }
  return false;
}

export class AroundFunctionRequest implements APIRequest<AroundHookResponse> {
  public readonly function_idx;
  public readonly hooks: Array<InstrumentHook<any>>;
  constructor(fidx: number) {
    this.function_idx = fidx;
    this.hooks = [];
  }

  addHook(hook: InstrumentHook<any>): AroundFunctionRequest {
    if (this.hooks.length === 0) {
      this.hooks.push(hook);
    } else {
      getGlobalLogger().debug(
        'Todo support multiple hooks. For now just one hook',
      );
    }
    return this;
  }

  getData(): string {
    const encodedFidx = encodeLEB128ToHex(this.function_idx);
    const encodedSchedule = this.hooks[0].schedule.serializeBinary();
    const encodedHook = this.hooks[0].serializeBinary();
    return `${Instruction.AroundFunction}${encodedFidx}${encodedSchedule}${encodedHook}\n`;
  }

  parse(input: string): AroundHookResponse {
    const err = new APIRequestInvalidParse(
      'No reply for AroundFunctionRequest',
    );
    const obj = JSON.parse(input);
    if (isAroundFunctionJSONResponse(obj)) {
      const reply = createAroundFunctionResponse(obj);
      if (reply === undefined) {
        throw err;
      } else {
        return reply;
      }
    } else {
      throw err;
    }
  }
}
