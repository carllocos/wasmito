import { HookWithSubscription, type Hook } from '../../../hooks/hook';
import { createLogger } from '../../../logger/logger';
import { isHexaString } from '../../../util/decoder';
import { Instruction } from './instructions';
import {
  APIRequest,
  APIRequestInvalidParse,
  ResponseType,
  type RequestMessage,
} from '../../request_interface';
import { getExceptionMsgFromErrorCode } from './request_error_code';

const logger = createLogger('HookOnError');

export interface HookOnErrorJSONResponse extends RequestMessage {}

export abstract class HookOnErrorResponse {
  abstract isSucessful(): boolean;
}

export class HookOnErrorSuccessfulResponse extends HookOnErrorResponse {
  isSucessful(): boolean {
    return true;
  }
}

export class HookOnErrorFailedResponse extends HookOnErrorResponse {
  public readonly errorCode: number;
  public readonly errorMessage: string;

  constructor(errorCode: number, errorMsg: string) {
    super();
    this.errorCode = errorCode;
    this.errorMessage = errorMsg;
  }

  isSucessful(): boolean {
    return false;
  }
}

export class HookOnErrorSubsriptionMessage {
  public readonly subsriptionData: any;
  constructor(data: string) {
    if (isHexaString(data)) {
      this.subsriptionData = this.parseHexaString(data);
    } else {
      this.subsriptionData = this.parseJSONString(data);
    }
  }

  private parseHexaString(data: string): string {
    if (Instruction.HookOnError !== data.slice(0, 2)) {
      throw Error('Invalid subsription data');
    }

    if (ResponseType.SubscriptionResponse !== data.slice(2, 4)) {
      throw Error('Invalid subsription data');
    }
    return data.slice(4);
  }

  private parseJSONString(data: string): any {
    const parsed = JSON.parse(data);
    if (
      parsed.interrupt !== Instruction.HookOnError ||
      parsed.kind !== ResponseType.SubscriptionResponse
    ) {
      throw new Error('Invalid subscription message');
    }
    let subContent: any = {};
    if (typeof parsed.sub === 'string') {
      subContent = JSON.parse(parsed.sub);
    } else if (typeof parsed.sub === 'object') {
      subContent = parsed.sub;
    } else if (parsed.sub === undefined) {
      throw new Error('Invalid subscription message');
    } else {
      subContent = parsed.sub;
    }

    return subContent;
  }
}

export function isSuccessfullHookOnErrorResponse(
  response: HookOnErrorResponse,
): boolean {
  return response instanceof HookOnErrorSuccessfulResponse;
}

export class HookOnError extends APIRequest<HookOnErrorResponse> {
  public readonly hooks: Hook[];
  private readonly interruptNr: Instruction;

  constructor() {
    super();
    this.hooks = [];
    this.interruptNr = Instruction.HookOnError;
  }

  onError(hook: Hook): HookOnError {
    this.addHook(hook);
    return this;
  }

  description(): string {
    const hooksStr = this.hooks
      .map((hook) => {
        return hook.description();
      })
      .join(', ');

    return `HookOnErrorRequest hooks: ${hooksStr}`;
  }

  override getData(): string {
    let encodedSchedule = '';
    let encodedHook = '';
    encodedSchedule = this.hooks[0].schedule.serializeBinary();
    encodedHook = this.hooks[0].serializeBinary();
    return `${this.interruptNr}${encodedSchedule}${encodedHook}\n`;
  }

  override parse(input: string): HookOnErrorResponse {
    const response: HookOnErrorResponse | undefined =
      this.decodeHexaStringResponse(input);
    if (response === undefined) {
      throw new APIRequestInvalidParse('No reply for HookOnError');
    }
    return response;
  }

  override isSubscriptionClosed(): boolean {
    return false;
  }

  override handleSubscriptionData(data: string): void {
    try {
      const msg = new HookOnErrorSubsriptionMessage(data);
      for (let i = 0; i < this.hooks.length; i++) {
        const hook = this.hooks[i];
        if (hook instanceof HookWithSubscription) {
          let parsed: any;
          let successfulParse = false;
          try {
            parsed = hook.parseSubscriptionData(msg.subsriptionData);
            successfulParse = true;
          } catch (e) {}

          if (successfulParse) {
            try {
              hook.onSubscriptionData(parsed);
            } catch (e) {
              logger.error(`Hook handler threw error: `, e);
            }
          }
        }
      }
    } catch (e) {}
  }

  private addHook(hook: Hook): HookOnError {
    if (this.hooks.length === 0) {
      this.hooks.push(hook);
    } else {
      logger.error('Todo support multiple hooks. For now just one hook');
    }
    return this;
  }

  private decodeHexaStringResponse(
    hexaInput: string,
  ): HookOnErrorResponse | undefined {
    // format: header | response type | possible body 1
    // header: HookOnError Instruction Nr (2 chars hexa) |
    // response_type : 2 chars hexa
    // body1 only if response type is error: error code (2 chars hexa)

    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(hexaInput)) {
      return undefined;
    }

    if (hexaInput.length < 4) {
      return undefined;
    }

    if (Instruction.HookOnError !== hexaInput.slice(0, 2)) {
      return undefined;
    }
    const typeResponse = hexaInput.slice(2, 4);
    if (typeResponse === ResponseType.SuccessResponse) {
      if (hexaInput.length > 4) {
        logger.error(
          `Successful response contains more than just instruction type and response type. Extra content ${hexaInput.slice(
            4,
          )} . Full message ${hexaInput}`,
        );
      }
      return new HookOnErrorSuccessfulResponse();
    } else if (typeResponse === ResponseType.ErrorResponse) {
      const errorCodeHexa = hexaInput.slice(4, 6);
      const errorCode = parseInt(errorCodeHexa, 16);
      if (isNaN(errorCode)) {
        logger.error(
          `Error response received a non hexa errorCode. Given '${errorCodeHexa}'. Full message '${hexaInput}'`,
        );
        return undefined;
      }

      const excpMsg = getExceptionMsgFromErrorCode(errorCode);
      if (excpMsg === undefined) {
        logger.error(`No error message registered for errorCode ${errorCode}`);
      }

      if (hexaInput.length > 6) {
        logger.error(
          `Error response contains more than just instruction type, response type, and errorCode. Extra content ${hexaInput.slice(
            6,
          )} . Full message ${hexaInput}`,
        );
      }

      return new HookOnErrorFailedResponse(errorCode, excpMsg ?? '');
    } else {
      logger.error(
        `Error response contains no valid response type ${typeResponse} . Full message ${hexaInput}`,
      );
      return undefined;
    }
  }
}
