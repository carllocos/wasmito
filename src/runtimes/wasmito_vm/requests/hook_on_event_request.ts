import { runHooksAndListeners, type Hook } from '../../../hooks/hook';
import { createLogger } from '../../../logger/logger';
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
  const enumValues: string[] = Object.values(HookOnEventMoment);
  if (enumValues.includes(str)) {
    return str as HookOnEventMoment;
  }
  return undefined;
}

export class HookOnEventRequest extends APIRequest<RequestMessage> {
  readonly instruction = Instruction.HookOnEvent;

  public readonly hooks: Hook[];
  private hookMoment: HookOnEventMoment;

  constructor(moment: HookOnEventMoment) {
    super();
    this.hooks = [];
    this.instruction = Instruction.HookOnEvent;
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
    return `${this.instruction}${this.serializeID()}${this.hookMoment}${encodedSchedule}${encodedHook}\n`;
  }

  override parse(_input: string): RequestMessage {
    throw new Error(`TODO remove`);
  }

  override isSubscriptionClosed(): boolean {
    return false;
  }

  override processAck(ack: RequestMessage): RequestMessage {
    if (isRequestMessage(ack, this.instruction)) return ack;
    throw new APIRequestInvalidParse('No reply for HookOnEvent');
  }

  override async processSubscriptionData(
    msg: RequestMessage,
  ): Promise<SubscriptionParseOutcome> {
    if (!isSubscriptionMessage(msg, this.instruction)) {
      return SubscriptionParseOutcome.Failed;
    }
    return await runHooksAndListeners(this.hooks, msg.sub, logger);
  }

  public addHook(hook: Hook): HookOnEventRequest {
    this.hooks.push(hook);
    return this;
  }
}
