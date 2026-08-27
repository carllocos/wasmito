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
  RequestMessage,
  SubscribeResponse,
} from '../../request_msg';
import assert from 'assert';
import { JSONParse } from 'json-with-bigint';

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

const logger = createLogger('HookOnWasmAddrRequest');

export class HookOnWasmAddrRequest extends APIRequest<RequestMessage> {
  readonly instruction = Instruction.HookOnWasmAddr;
  private readonly logger: Logger;
  public readonly wasmAddr;
  private _hook: Hook | undefined;
  private moment: HookOnWasmAddrMoment;
  protected isaddRequest: boolean; // true for add, false for remove;
  private subscriptionActive: boolean;

  constructor(wasmAddr: number, moment?: HookOnWasmAddrMoment) {
    super();
    this.wasmAddr = wasmAddr;
    this.moment = moment ?? HookOnWasmAddrMoment.HookBefore;
    this.isaddRequest = true;
    this.logger = logger;
    this.subscriptionActive = true;
  }

  get hook(): Hook | undefined {
    return this._hook;
  }

  set hook(h: Hook) {
    this._hook = h;
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
    if (this._hook === undefined) {
      this._hook = hook;
    } else {
      const errMsg = `Cannot asisgn multiple hooks`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }
    return this;
  }
  description(): string {
    const hooksDescription = this._hook?.description() ?? '';
    if (this.isaddRequest) {
      return `HookOnWasmAddrRequest for ${this.wasmAddr} hooks: [${hooksDescription}]`;
    } else {
      return `RemoveHookOnWasmAddrRequest for ${this.wasmAddr} hooks: [${hooksDescription}]`;
    }
  }

  override getData(): string {
    assert(this._hook !== undefined, 'hook was not assigned');
    const encodedAddr = encodeToHexLEB128(this.wasmAddr);
    let encodedSchedule = '';
    let encodedHook = '';
    let encodedAddOrRemoveOp = '00';
    if (this.isaddRequest) {
      encodedSchedule = this._hook.schedule.serializeBinary();
      encodedHook = this._hook.serializeBinary();
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
    msg: SubscribeResponse,
  ): Promise<SubscriptionParseOutcome> {
    const content = parseSubContentMessage(this.moment, this.wasmAddr, msg.sub);
    if (content === undefined) {
      return SubscriptionParseOutcome.Failed;
    }

    assert(this._hook !== undefined, 'hook was not assigned');

    const m = {
      msg,
      metadata: content,
      sub: content.val,
    };
    return await runHooksAndListeners(m, [this._hook], this.logger);
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

export interface HookOnAddrSubContent {
  moment: HookOnWasmAddrMoment;
  addr: number;
  val: any;
}

export function isHookOnAddrSubContent(
  input: any,
): input is HookOnAddrSubContent {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.moment !== undefined &&
    typeof input.moment === 'string' &&
    getHookMomentFromString(input.moment) !== undefined &&
    input.addr !== undefined &&
    typeof input.addr === 'number' &&
    input.val !== undefined
  );
}

function parseSubContentMessage(
  moment: HookOnWasmAddrMoment,
  wasmAddr: number,
  sub: any,
): undefined | HookOnAddrSubContent {
  try {
    let subContent: any = {};
    if (typeof sub === 'string') {
      subContent = JSONParse(sub);
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
