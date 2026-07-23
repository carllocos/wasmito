import { runHooksAndListeners, type Hook } from '../../../hooks/hook';
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
  ResponseType,
} from '../../request_msg';

const logger = createLogger('HookOnError');

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

export class HookOnError extends APIRequest<RequestMessage> {
  readonly instruction = Instruction.HookOnError;
  public readonly hooks: Hook[];

  constructor() {
    super();
    this.hooks = [];
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
    return `${this.instruction}${this.serializeID()}${encodedSchedule}${encodedHook}\n`;
  }

  override parse(_input: string): RequestMessage {
    throw new APIRequestInvalidParse('No reply for HookOnError');
  }

  processAck(ack: RequestMessage): RequestMessage {
    if (isRequestMessage(ack, this.instruction) === undefined) {
      throw new APIRequestInvalidParse('No reply for HookOnError');
    }
    return ack;
  }

  async processSubscriptionData(
    sub: RequestMessage,
  ): Promise<SubscriptionParseOutcome> {
    if (isSubscriptionMessage(sub, this.instruction)) {
      return await runHooksAndListeners(this.hooks, sub.sub, logger);
    }

    return SubscriptionParseOutcome.Failed;
  }

  override isSubscriptionClosed(): boolean {
    return false;
  }

  private addHook(hook: Hook): HookOnError {
    if (this.hooks.length === 0) {
      this.hooks.push(hook);
    } else {
      logger.error('Todo support multiple hooks. For now just one hook');
    }
    return this;
  }
}
