import { createLogger } from '../../logger/logger';
import { encodeToHexLEB128 } from '../../util/encoder';
import {
  APIRequest,
  APIRequestInvalidParse,
  createRequestMessage,
  isSubscriptionMessage,
  type RequestMessage,
} from '../api/request_interface';
import { HookWithSubscription, type Hook } from '../../hooks/hook';
import { Instruction } from '../api/instructions';
import type winston from 'winston';

export enum HookOnWasmAddrMoment {
  HookBefore = '01',
  HookAfter = '02',
}

export function getHookMomentFromString(
  str: string,
): HookOnWasmAddrMoment | undefined {
  switch (str) {
    case '01':
      return HookOnWasmAddrMoment.HookBefore;
    case '02':
      return HookOnWasmAddrMoment.HookAfter;
    default:
      return undefined;
  }
}

export interface HookOnWasmAddrJSONResponse extends RequestMessage {}

export interface HookOnWasmAddrResponse extends HookOnWasmAddrJSONResponse {}

function isHookOnWasmAddrResponse(response: RequestMessage): boolean {
  return response.interrupt === Instruction.HookOnWasmAddr;
}

export function createHookOnWasmAddrResponse(
  msg: RequestMessage,
): HookOnWasmAddrResponse {
  return msg;
}

export class HookOnWasmAddrRequest extends APIRequest<HookOnWasmAddrResponse> {
  private readonly logger: winston.Logger;
  public readonly wasmAddr;
  public readonly hooks: Hook[];
  private moment: HookOnWasmAddrMoment;
  private readonly interruptNr: Instruction;
  protected isaddRequest: boolean; // true for add, false for remove;

  constructor(wasmAddr: number) {
    super();
    this.wasmAddr = wasmAddr;
    this.hooks = [];
    this.moment = HookOnWasmAddrMoment.HookBefore;
    this.interruptNr = Instruction.HookOnWasmAddr;
    this.isaddRequest = true;
    this.logger = createLogger('HookOnWasmAddrRequest');
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
    if (this.isaddRequest) {
      return `HookOnWasmAddrRequest for ${this.wasmAddr}`;
    } else {
      return `RemoveHookOnWasmAddrRequest for ${this.wasmAddr}`;
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
    return `${this.interruptNr}${encodedAddr}${this.moment}${encodedAddOrRemoveOp}${encodedSchedule}${encodedHook}\n`;
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

  override handleSubscriptionData(data: string): void {
    const msg = createRequestMessage(data);
    if (msg === undefined || !isSubscriptionMessage(msg)) {
      return;
    }
    try {
      let subContent: any = {};
      if (typeof msg.sub === 'string') {
        subContent = JSON.parse(msg.sub);
      } else if (typeof msg.sub === 'object') {
        subContent = msg.sub;
      }

      if (
        typeof subContent.moment !== 'string' ||
        subContent.val === undefined
      ) {
        return;
      }
      const hookMoment = getHookMomentFromString(subContent.moment);
      if (hookMoment === undefined || hookMoment !== this.moment) {
        return;
      }

      const hookedAddr = parseInt(subContent.addr, 16);
      if (isNaN(hookedAddr) || this.wasmAddr !== hookedAddr) {
        return;
      }

      for (let i = 0; i < this.hooks.length; i++) {
        const hook = this.hooks[i];
        if (hook instanceof HookWithSubscription) {
          let parsed: any;
          let successfulParse = false;
          try {
            parsed = hook.parseSubscriptionData(subContent.val);
            successfulParse = true;
          } catch (e) {}

          if (successfulParse) {
            try {
              hook.onSubscriptionData(parsed);
            } catch (e) {
              this.logger.info(`Hook handler threw error: `, e);
            }
          }
        }
      }
    } catch (e) {}
  }
}

export interface RemoveHookOnWasmAddrResponse
  extends HookOnWasmAddrJSONResponse {}

export class RemoveHookOnWasmAddrRequest extends HookOnWasmAddrRequest {
  constructor(wasmAddr: number) {
    super(wasmAddr);
    this.isaddRequest = false;
  }
}
