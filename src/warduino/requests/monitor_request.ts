import { getGlobalLogger } from '../../logger/logger';
import { encodeToHexLEB128 } from '../../util/encoder';
import {
  APIRequest,
  APIRequestInvalidParse,
  createRequestMessage,
  isSubscriptionMessage,
  type RequestMessage,
} from '../api/request_interface';
import { type Hook } from '../../hooks/hook';
import { Instruction } from '../api/instructions';

export enum MonitorMoment {
  MonitorBefore = '01',
  MonitorAfter = '02',
}

export function getMonitorMomentFromString(
  str: string,
): MonitorMoment | undefined {
  switch (str) {
    case '01':
      return MonitorMoment.MonitorBefore;
    case '02':
      return MonitorMoment.MonitorAfter;
    default:
      return undefined;
  }
}

export interface MonitorWasmAddrJSONResponse extends RequestMessage {}

export interface MonitorWasmAddrResponse extends MonitorWasmAddrJSONResponse {}

function isMonitorWasmAddrResponse(response: RequestMessage): boolean {
  return response.interrupt === Instruction.MonitorWasmAddr;
}

export function createMonitorWasmAddrResponse(
  msg: RequestMessage,
): MonitorWasmAddrResponse {
  return msg;
}

export class MontiroWasmAddrRequest extends APIRequest<MonitorWasmAddrResponse> {
  public readonly wasmAddr;
  public readonly hooks: Array<Hook<any>>;
  private moment: MonitorMoment;
  private readonly interruptNr: Instruction;
  protected isaddRequest: boolean; // true for add, false for remove;

  constructor(wasmAddr: number) {
    super();
    this.wasmAddr = wasmAddr;
    this.hooks = [];
    this.moment = MonitorMoment.MonitorBefore;
    this.interruptNr = Instruction.MonitorWasmAddr;
    this.isaddRequest = true;
  }

  before(): MontiroWasmAddrRequest {
    this.moment = MonitorMoment.MonitorBefore;
    return this;
  }

  after(): MontiroWasmAddrRequest {
    this.moment = MonitorMoment.MonitorAfter;
    return this;
  }

  addHook(hook: Hook<any>): MontiroWasmAddrRequest {
    if (this.hooks.length === 0) {
      this.hooks.push(hook);
    } else {
      getGlobalLogger().debug(
        'Todo support multiple hooks. For now just one hook',
      );
    }
    return this;
  }

  description(): string {
    return `MonitorRequest for ${this.wasmAddr}`;
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

  override parse(input: string): MonitorWasmAddrResponse {
    const err = new APIRequestInvalidParse('No reply for MonitorWasmAddr');
    const msg: RequestMessage | undefined = createRequestMessage(input);
    if (msg === undefined) {
      throw err;
    }
    if (isMonitorWasmAddrResponse(msg)) {
      const reply = createMonitorWasmAddrResponse(msg);
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
      const monitorMoment = getMonitorMomentFromString(subContent.moment);
      if (monitorMoment === undefined || monitorMoment !== this.moment) {
        return;
      }

      const monitoredAddr = parseInt(subContent.addr, 16);
      if (isNaN(monitoredAddr) || this.wasmAddr !== monitoredAddr) {
        return;
      }

      for (let i = 0; i < this.hooks.length; i++) {
        const hook = this.hooks[i];
        if (
          hook.parseSubscriptionData !== undefined &&
          hook.onSubscriptionData !== undefined
        ) {
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
              getGlobalLogger().info(`Hook handler threw error: `);
              getGlobalLogger().info(e);
            }
          }
        }
      }
    } catch (e) {}
  }
}

export interface RemoveAddrResponse extends MonitorWasmAddrJSONResponse {}

export class RemoveMonitorWasmAddrRequest extends MontiroWasmAddrRequest {
  constructor(wasmAddr: number) {
    super(wasmAddr);
    this.isaddRequest = false;
  }
}
