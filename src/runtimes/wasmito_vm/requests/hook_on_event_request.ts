import {
  FatalHookError,
  parseHookContent,
  type Hook,
} from '../../../hooks/hook';
import { createLogger } from '../../../logger/logger';
import { isHexaString } from '../../../util/decoder';
import { Instruction } from './instructions';
import {
  APIRequest,
  APIRequestInvalidParse,
  SubscriptionParseOutcome,
} from '../../request_interface';
import {
  isRequestMessage,
  isSubscriptionMessage,
  RequestMessage,
} from '../../request_msg';

const logger = createLogger('HookOnEventRequest');

export enum HookOnEventMoment {
  onNewEvent = '01',
  beforeEventHandled = '02',
  afterEventHandled = '03',
}

export function getHookOnEventMomentFromString(
  str: string,
): HookOnEventMoment | undefined {
  switch (str) {
    case '01':
      return HookOnEventMoment.onNewEvent;
    case '02':
      return HookOnEventMoment.beforeEventHandled;
    case '03':
      return HookOnEventMoment.afterEventHandled;
    default:
      return undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HookOnEventJSONResponse extends RequestMessage {}

export abstract class HookOnEventResponse {
  abstract isSucessful(): boolean;
}

export class HookOnEventSuccessfulResponse extends HookOnEventResponse {
  isSucessful(): boolean {
    return true;
  }
}

export class HookOnEventErrorResponse extends HookOnEventResponse {
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

export class HookOnEventSubsriptionMessage {
  public readonly subsriptionData: any;
  constructor(data: string) {
    if (isHexaString(data)) {
      this.subsriptionData = this.parseHexaString(data);
    } else {
      this.subsriptionData = this.parseJSONString(data);
    }
  }

  private parseHexaString(data: string): string {
    if (Instruction.HookOnEvent !== data.slice(0, 2)) {
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
      parsed.interrupt !== Instruction.HookOnEvent ||
      parsed.kind !== ResponseType.SubscriptionResponse
    ) {
      throw new Error('Invalid subscription message');
    }
    let subContent: any = {};
    if (typeof parsed.sub === 'string') {
      subContent = JSON.parse(parsed.sub);
    } else if (typeof parsed.sub === 'object') {
      subContent = parsed.sub;
    }

    if (
      subContent.moment !== HookOnEventMoment.afterEventHandled &&
      subContent.moment !== HookOnEventMoment.beforeEventHandled &&
      subContent.moment !== HookOnEventMoment.onNewEvent
    ) {
      throw new Error('Invalid subscription message');
    }

    if (subContent.val === undefined) {
      throw new Error('Invalid subscription message');
    }
    return subContent.val;
  }
}

// function isHookOnEventResponse(response: RequestMessage): boolean {
//   return response.interrupt === Instruction.HookOnWasmAddr;
// }

// function createHookOnEventResponse(msg: RequestMessage): HookOnEventResponse {
//   return msg;
// }

export function isSuccessfullHookOnEventResponse(
  response: HookOnEventResponse,
): boolean {
  return response instanceof HookOnEventSuccessfulResponse;
}

export class HookOnEventRequest extends APIRequest<HookOnEventResponse> {
  public readonly hooks: Hook[];
  private readonly interruptNr: Instruction;
  private hookMoment: HookOnEventMoment;

  constructor(moment: HookOnEventMoment) {
    super();
    this.hooks = [];
    this.interruptNr = Instruction.HookOnEvent;
    this.hookMoment = moment;
  }

  description(): string {
    let hookMomentStr = 'After event handled';
    if (this.hookMoment === HookOnEventMoment.beforeEventHandled) {
      hookMomentStr = 'Before event handled';
    } else if (this.hookMoment === HookOnEventMoment.onNewEvent) {
      hookMomentStr = 'On new event';
    }

    const hooksStr = this.hooks
      .map((hook) => {
        return hook.description();
      })
      .join(', ');

    return `HookOnEventRequest (${hookMomentStr}) hooks: ${hooksStr}`;
  }

  override getData(): string {
    let encodedSchedule = '';
    let encodedHook = '';
    encodedSchedule = this.hooks[0].schedule.serializeBinary();
    encodedHook = this.hooks[0].serializeBinary();
    return `${this.interruptNr}${this.hookMoment}${encodedSchedule}${encodedHook}\n`;
  }

  override parse(input: string): HookOnEventResponse {
    // TODO parse hexa string and convert to json object
    const response: HookOnEventResponse | undefined =
      this.decodeHexaStringResponse(input);
    if (response === undefined) {
      throw new APIRequestInvalidParse('No reply for HookOnEvent');
    }
    return response;
  }

  override isSubscriptionClosed(): boolean {
    return false;
  }

  override handleSubscriptionData(data: string): SubscriptionParseOutcome {
    let postOnData = SubscriptionParseOutcome.Failed;
    try {
      const msg = new HookOnEventSubsriptionMessage(data);
      const s = parseHookContent(this.hooks, msg.subsriptionData, logger);
      if (s) postOnData = SubscriptionParseOutcome.Successful;
    } catch (e) {
      if (e instanceof FatalHookError) throw e;
    }
    return postOnData;
  }

  public addHook(hook: Hook): HookOnEventRequest {
    this.hooks.push(hook);
    return this;
  }

  private decodeHexaStringResponse(
    hexaInput: string,
  ): HookOnEventResponse | undefined {
    // format: header | response type | possible body 1
    // header: HookOnEvent Instruction Nr (2 chars hexa) |
    // response_type : 2 chars hexa
    // body1 only if response type is error: error code (2 chars hexa)

    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(hexaInput)) {
      return undefined;
    }

    if (hexaInput.length < 4) {
      return undefined;
    }

    if (Instruction.HookOnEvent !== hexaInput.slice(0, 2)) {
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
      return new HookOnEventSuccessfulResponse();
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

      return new HookOnEventErrorResponse(errorCode, excpMsg ?? '');
    } else {
      logger.error(
        `Error response contains no valid response type ${typeResponse} . Full message ${hexaInput}`,
      );
      return undefined;
    }
  }
}
