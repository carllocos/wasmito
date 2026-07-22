import { getGlobalLogger } from '../../../logger/logger';
import { encodeToHexLEB128 } from '../../../util/encoder';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import {
  getResponseTypeFromString,
  RequestMessage,
  ResponseType,
} from '../../request_msg';
import { Instruction, getInstructionFromString } from './instructions';
import { type Hook } from '../../../hooks/hook';

export interface AroundFunctionJSONResponse {
  interrupt: string;
  kind: string;
  error_code?: string;
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
    if (isNaN(code)) {
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

export class AroundFunctionRequest extends APIRequestNoSubscription<AroundHookResponse> {
  public readonly function_idx;
  public readonly hooks: Hook[];
  private _isAddRequest: boolean;

  constructor(fidx: number) {
    super();
    this.function_idx = fidx;
    this.hooks = [];
    this._isAddRequest = true;
  }

  description(): string {
    return `AroundFunction for ${this.function_idx}`;
  }

  removeRequest(): AroundFunctionRequest {
    this._isAddRequest = false;
    return this;
  }

  addRequest(): AroundFunctionRequest {
    this._isAddRequest = true;
    return this;
  }

  addHook(hook: Hook): AroundFunctionRequest {
    if (this.hooks.length === 0) {
      this.hooks.push(hook);
    } else {
      getGlobalLogger().debug(
        'Todo support multiple hooks. For now just one hook',
      );
    }
    return this.addRequest();
  }

  getData(): string {
    const encodedFidx = encodeToHexLEB128(this.function_idx);
    if (this._isAddRequest) {
      const addRequest = '01';
      const encodedSchedule = this.hooks[0].schedule.serializeBinary();
      const encodedHook = this.hooks[0].serializeBinary();
      return `${Instruction.AroundFunction}${encodedFidx}${addRequest}${encodedSchedule}${encodedHook}\n`;
    } else {
      const removeReq = '00';
      return `${Instruction.AroundFunction}${encodedFidx}${removeReq}\n`;
    }
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
