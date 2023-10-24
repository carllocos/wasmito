import { getGlobalLogger } from '../../logger/logger';
import { encodeLEB128ToHex } from '../../util/encoder';
import {
  type APIRequest,
  Instruction,
  APIRequestInvalidParse,
  getInstructionFromString,
} from './request_interface';

import { type InstrumentAction } from '../../instrumentor/action';

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

export interface AroundActionResponse {
  interrupt: Instruction;
  responseType: ResponseType;
  error_code?: number;
}

export function createAroundFunctionResponse(
  obj: AroundFunctionJSONResponse,
): AroundActionResponse | undefined {
  const instr = getInstructionFromString(obj.interrupt);
  const responseType = getResponseTypeFromString(obj.kind);
  if (
    instr === undefined ||
    responseType === undefined ||
    instr !== Instruction.AroundFunction
  ) {
    return undefined;
  }

  const reply: AroundActionResponse = {
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
export function isSuccessfulReply(reply: AroundActionResponse): boolean {
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

export class AroundFunctionRequest implements APIRequest<AroundActionResponse> {
  public readonly function_idx;
  public readonly actions: Array<InstrumentAction<any>>;
  constructor(fidx: number) {
    this.function_idx = fidx;
    this.actions = [];
  }

  addAction(action: InstrumentAction<any>): AroundFunctionRequest {
    if (this.actions.length === 0) {
      this.actions.push(action);
    } else {
      getGlobalLogger().debug(
        'Todo support multiple actions. For now just one action',
      );
    }
    return this;
  }

  getData(): string {
    const encodedFidx = encodeLEB128ToHex(this.function_idx);
    const encodedSchedule = this.actions[0].schedule.serializeBinary();
    const encodedAction = this.actions[0].serializeBinary();
    return `${Instruction.AroundFunction}${encodedFidx}${encodedSchedule}${encodedAction}\n`;
  }

  parse(input: string): AroundActionResponse {
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
