import { createLogger } from '../../logger/logger';
import { WASM } from '../../webassembly/wasm';
import { Instruction, getInstructionFromString } from '../api/instructions';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
  ResponseType,
} from '../api/request_interface';
import { getExceptionMsgFromErrorCode } from './request_error_code';

const logger = createLogger('FunCallRequest');

export abstract class FunCallRequest<R> extends APIRequestNoSubscription<R> {
  private readonly funcToCall: number;
  private readonly args: WASM.Value[];
  private readonly isProxyCall: boolean;

  constructor(
    funcToCall: number,
    args: WASM.Value[],
    isProxyCall: boolean = false,
  ) {
    super();
    this.funcToCall = funcToCall;
    this.args = args;
    this.isProxyCall = isProxyCall;
  }

  description(): string {
    const argsStr = this.args
      .map((a) => {
        return `${a.value} (${WASM.typeToString(a.type)})`;
      })
      .join(', ');
    const typeRequest = this.isProxyCall ? 'ProxyCall' : 'FunCallRequest';
    return `${typeRequest}${this.funcToCall} with args [${argsStr}]`;
  }

  getData(): string {
    return this.encodeRemoteCallRequest();
  }

  abstract parse(input: string): R;

  encodeRemoteCallRequest(): string {
    // format: interrupt | LEB32 funcid | args | newline | null termination
    // interrupt
    let encoding = '';
    encoding += this.isProxyCall ? Instruction.ProxyCall : Instruction.FuncCall;

    // funcid
    encoding += WASM.leb128(this.funcToCall);

    // args
    const config: WASM.EncodingWasmValueOptions = {
      includeIndex: false,
      includeType: false,
    };
    encoding += WASM.encodeWasmValues(this.args, config);

    // newline
    encoding += '\n';
    return encoding;
  }
}

export interface ProxyCallSuccessfulResponse {
  sucessFullCall: boolean;
  resultValue?: WASM.Value;
  exceptionMsg?: string;
}

export interface ProxyCallFailedRequest {
  errorCode: number;
  errorMessage: string;
}

export type ProxyCallResponse =
  | ProxyCallSuccessfulResponse
  | ProxyCallFailedRequest;

export function isProxyCallSuccessfulResponse(obj: any): boolean {
  return (
    typeof obj === 'object' &&
    typeof obj.sucessFullCall === 'boolean' &&
    (obj.resultValue === undefined || WASM.isWasmValue(obj.resultValue)) &&
    (obj.exceptionMsg === undefined || typeof obj.exceptionMsg === 'string')
  );
}

export class ProxyCallRequest extends FunCallRequest<ProxyCallResponse> {
  constructor(funcToCall: number, args: WASM.Value[]) {
    super(funcToCall, args, true);
  }

  parse(input: string): ProxyCallResponse {
    const response = this.decodeHexaStringResponse(input);
    if (response === undefined) {
      throw new APIRequestInvalidParse(`No response for ${this.description()}`);
    }
    return response;
  }

  decodeHexaStringResponse(hexaInput: string): ProxyCallResponse | undefined {
    // input format: header | body 1 or body 2
    // header: FunCall Instruction Nr (2 chars hexa) | response_type (2 chars hexa)
    // body1: successfullResponse
    // body2: errorResponse

    const interruptHexa = hexaInput.slice(0, 2);
    const instruction = getInstructionFromString(interruptHexa);
    if (instruction === undefined || instruction !== Instruction.FuncCall) {
      return undefined;
    }

    const responseType = hexaInput.slice(2, 4);
    if (responseType === ResponseType.SuccessResponse) {
      return this.decodeSuccessfulResponseHexaString(
        hexaInput.slice(4, hexaInput.length),
      );
    } else if (responseType === ResponseType.ErrorResponse) {
      return this.decodeErrorResponseHexaString(
        hexaInput.slice(4, hexaInput.length),
      );
    } else {
      return undefined;
    }
  }

  decodeSuccessfulResponseHexaString(
    hexaInput: string,
  ): ProxyCallSuccessfulResponse | undefined {
    // input format: header | body 1 or body 2
    // header: isSuccessfulCall (2 hex char)
    // body 1: has_value (2 hex char) | Wasm value (optional)
    // body 2: has_excp_msg (2 hex char) | excp_msg (optional)
    const parsedDidCallLeadToException = parseInt(hexaInput.slice(0, 2), 16);
    if (
      parsedDidCallLeadToException !== 1 &&
      parsedDidCallLeadToException !== 0
    ) {
      return undefined;
    }

    const didCallLeadToException = parsedDidCallLeadToException === 0;
    if (didCallLeadToException) {
      // Call was sucessful but it lead to a runtime exception e.g., devision by zero
      const response: ProxyCallSuccessfulResponse = {
        sucessFullCall: false,
      };
      const hasExceptionMsg = hexaInput.slice(2, 4);
      if (hasExceptionMsg === '00') {
        return response;
      } else if (hasExceptionMsg === '01') {
        throw Error(`TODO read exception MSG from hexaInput`);
      } else {
        return undefined;
      }
    } else {
      // call was successful
      const response: ProxyCallSuccessfulResponse = {
        sucessFullCall: true,
      };

      const hasResultValue = hexaInput.slice(2, 4);
      if (hasResultValue === '00') {
        return response;
      } else if (hasResultValue === '01') {
        throw Error(`TODO read resultValue MSG from hexaInput`);
      } else {
        return undefined;
      }
    }
  }

  decodeErrorResponseHexaString(
    hexaInput: string,
  ): ProxyCallFailedRequest | undefined {
    // format: error_code (2 hexa char) | has_excep (2 hexa char) | (optional) excp_msg
    const errorCode = parseInt(hexaInput.slice(0, 2));
    if (isNaN(errorCode)) {
      return undefined;
    }
    const exceptionMsg = getExceptionMsgFromErrorCode(errorCode);
    if (exceptionMsg === undefined) {
      logger.error(
        `Did not find a registered exception msg for error code ${errorCode}`,
      );
    }

    return {
      errorCode,
      errorMessage: exceptionMsg ?? '',
    };
  }
}
