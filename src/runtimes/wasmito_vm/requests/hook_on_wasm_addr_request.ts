import { createLogger, Logger } from '../../../logger/logger';
import { encodeToHexLEB128 } from '../../../util/encoder';
import {
  APIRequest,
  APIRequestInvalidParse,
  SubscriptionParseOutcome,
} from '../../request_interface';
import {
  FatalHookError,
  runHooksAndListeners,
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
  const moments: string[] = Object.values(HookOnWasmAddrMoment);
  if (moments.includes(str)) {
    return str as HookOnWasmAddrMoment;
  }
  return undefined;
}


export class HookOnWasmAddrRequest extends APIRequest<RequestMessage> {
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

  override parse(_input: string): RequestMessage {
    throw new Error('TODO remove');
  }

  override processAck(ack: RequestMessage): RequestMessage {
    if (isRequestMessage(ack, this.instruction)) {
      return ack;
    }
    throw new APIRequestInvalidParse('No reply for HookOnWasmAddr');
  }

  async processSubscriptionData(
    msg: RequestMessage,
  ): Promise<SubscriptionParseOutcome> {
    if (!isSubscriptionMessage(msg)) return SubscriptionParseOutcome.Failed;

    const content = parseSubContentMessage(this.moment, this.wasmAddr, msg.sub);
    if (content === undefined) {
      return SubscriptionParseOutcome.Failed;
    }

    return await runHooksAndListeners(this.hooks, content.val, this.logger);
  }

  override isSubscriptionClosed(): boolean {
    return !this.subscriptionActive;
  }

  closeSubscription(): void {
    this.subscriptionActive = false;
  }
}

export class RemoveHookOnWasmAddrRequest extends HookOnWasmAddrRequest {
  constructor(wasmAddr: number) {
    super(wasmAddr);
    this.isaddRequest = false;
  }

  override isSubscriptionClosed(): boolean {
    return true;
  }
}

interface HookOnAddrSubContent {
  moment: HookOnWasmAddrMoment;
  addr: number;
  val: any;
}

function parseSubContentMessage(
  moment: HookOnWasmAddrMoment,
  wasmAddr: number,
  sub: any,
): undefined | HookOnAddrSubContent {
  try {
    let subContent: any = {};
    if (typeof sub === 'string') {
      subContent = JSON.parse(sub);
    } else if (typeof sub === 'object') {
      subContent = sub;
    }

    if (typeof subContent.moment !== 'string' || subContent.val === undefined)
      return undefined;
    const hookMoment = getHookMomentFromString(subContent.moment);
    if (hookMoment === undefined || hookMoment !== moment) return undefined;

    const hookedAddr = parseInt(subContent.addr, 16);
    if (isNaN(hookedAddr) || wasmAddr !== hookedAddr) return undefined;

    const r: HookOnAddrSubContent = {
      moment: hookMoment,
      addr: hookedAddr,
      val: subContent.val,
    };
    return r;
  } catch (e) {
    if (e instanceof FatalHookError) throw e;
  }
  return undefined;
}
