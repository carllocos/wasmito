import { createLogger, Logger } from '../../../logger/logger';
import { encodeToHexLEB128 } from '../../../util/encoder';
import {
  APIRequest,
  APIRequestInvalidParse,
  SubscriptionParseOutcome,
} from '../../request_interface';
import {
  FatalHookError,
  parseHookContent,
  type Hook,
} from '../../../hooks/hook';
import { Instruction } from './instructions';
import {
  isRequestMessage,
  isSubscriptionMessage,
  RequestMessage,
} from '../../request_msg';

export enum HookOnWasmAddrMoment {
  HookBefore = '01',
  HookAfter = '02',
  HookAround = '03',
}

export function getHookMomentFromString(
  str: string,
): HookOnWasmAddrMoment | undefined {
  readonly instruction = Instruction.HookOnWasmAddr;
  private readonly logger: Logger;
  public readonly wasmAddr;
  public readonly hooks: Hook[];
  private moment: HookOnWasmAddrMoment;
  protected isaddRequest: boolean; // true for add, false for remove;
  private subscriptionActive: boolean;

  constructor(wasmAddr: number, moment?: HookOnWasmAddrMoment) {
    super();
    this.wasmAddr = wasmAddr;
    this.hooks = [];
    this.moment = moment ?? HookOnWasmAddrMoment.HookBefore;
    this.isaddRequest = true;
    this.logger = createLogger('HookOnWasmAddrRequest');
    this.subscriptionActive = true;
  }

  before(): HookOnWasmAddrRequest {
    this.moment = HookOnWasmAddrMoment.HookBefore;
    return this;
  }

  after(): HookOnWasmAddrRequest {
    this.moment = HookOnWasmAddrMoment.HookAfter;
    return this;
  }

  addHook(hook: Hook): HookOnWasmAddrRequest {
    if (this.hooks.length === 0) {
      this.hooks.push(hook);
    } else {
      this.logger.debug('Todo support multiple hooks. For now just one hook');
    }
    return this;
  }

  description(): string {
    const hooksDescription = this.hooks.map((h) => h.description()).join(', ');
    if (this.isaddRequest) {
      return `HookOnWasmAddrRequest for ${this.wasmAddr} hooks: [${hooksDescription}]`;
    } else {
      return `RemoveHookOnWasmAddrRequest for ${this.wasmAddr} hooks: [${hooksDescription}]`;
    }
  }

  override getData(): string {
    const encodedAddr = encodeToHexLEB128(this.wasmAddr);
    let encodedSchedule = '';
    let encodedHook = '';
    let encodedAddOrRemoveOp = '00';
    if (this.isaddRequest) {
      encodedSchedule = this.hooks[0].schedule.serializeBinary();
      encodedHook = this.hooks[0].serializeBinary();
      encodedAddOrRemoveOp = '01';
    }
    return `${this.instruction}${this.serializeID()}${encodedAddr}${this.moment}${encodedAddOrRemoveOp}${encodedSchedule}${encodedHook}\n`;
  }

  override parse(input: string): HookOnWasmAddrResponse {
    const err = new APIRequestInvalidParse('No reply for HookOnWasmAddr');
    const msg: RequestMessage | undefined = createRequestMessage(input);
    if (msg === undefined) {
      throw err;
    }
    if (isHookOnWasmAddrResponse(msg)) {
      const reply = createHookOnWasmAddrResponse(msg);
      if (reply === undefined) {
        throw err;
      } else {
        return reply;
      }
    } else {
      throw err;
    }
  }

  override isSubscriptionClosed(): boolean {
    return !this.subscriptionActive;
  }

  closeSubscription(): void {
    this.subscriptionActive = false;
  }

  override handleSubscriptionData(data: string): SubscriptionParseOutcome {
    const msg = createRequestMessage(data);
    if (msg === undefined || !isSubscriptionMessage(msg))
      return SubscriptionParseOutcome.Failed;
    try {
      let subContent: any = {};
      if (typeof msg.sub === 'string') {
        subContent = JSON.parse(msg.sub);
      } else if (typeof msg.sub === 'object') {
        subContent = msg.sub;
      }

      if (typeof subContent.moment !== 'string' || subContent.val === undefined)
        return SubscriptionParseOutcome.Failed;
      const hookMoment = getHookMomentFromString(subContent.moment);
      if (hookMoment === undefined || hookMoment !== this.moment)
        return SubscriptionParseOutcome.Failed;

      const hookedAddr = parseInt(subContent.addr, 16);
      if (isNaN(hookedAddr) || this.wasmAddr !== hookedAddr)
        return SubscriptionParseOutcome.Failed;

      const s = parseHookContent(this.hooks, subContent.val, this.logger);
      return s
        ? SubscriptionParseOutcome.Successful
        : SubscriptionParseOutcome.Failed;
    } catch (e) {
      if (e instanceof FatalHookError) throw e;
    }
    return SubscriptionParseOutcome.Failed;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RemoveHookOnWasmAddrResponse
  extends HookOnWasmAddrJSONResponse {}

export class RemoveHookOnWasmAddrRequest extends HookOnWasmAddrRequest {
  constructor(wasmAddr: number) {
    super(wasmAddr);
    this.isaddRequest = false;
  }

  override isSubscriptionClosed(): boolean {
    return true;
  }
}
