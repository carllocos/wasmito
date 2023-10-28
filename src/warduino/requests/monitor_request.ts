import { getGlobalLogger } from '../../logger/logger';
import { encodeLEB128ToHex } from '../../util/encoder';
import {
  APIRequestInvalidParse,
  APISubscriptionRequest,
  createRequestMessage,
  isSubscriptionMessage,
  type RequestMessage,
} from '../api/request_interface';
import { type InstrumentAction } from '../../instrumentor/action';
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

export class MontiroWasmAddrRequest extends APISubscriptionRequest<MonitorWasmAddrResponse> {
  public readonly wasmAddr;
  public readonly actions: Array<InstrumentAction<any>>;
  private moment: MonitorMoment;
  private readonly interruptNr: Instruction;
  constructor(wasmAddr: number) {
    super();
    this.wasmAddr = wasmAddr;
    this.actions = [];
    this.moment = MonitorMoment.MonitorBefore;
    this.interruptNr = Instruction.MonitorWasmAddr;
  }

  before(): MontiroWasmAddrRequest {
    this.moment = MonitorMoment.MonitorBefore;
    return this;
  }

  after(): MontiroWasmAddrRequest {
    this.moment = MonitorMoment.MonitorAfter;
    return this;
  }

  addAction(action: InstrumentAction<any>): MontiroWasmAddrRequest {
    if (this.actions.length === 0) {
      this.actions.push(action);
    } else {
      getGlobalLogger().debug(
        'Todo support multiple actions. For now just one action',
      );
    }
    return this;
  }

  override getData(): string {
    const encodedAddr = encodeLEB128ToHex(this.wasmAddr);
    const encodedSchedule = this.actions[0].schedule.serializeBinary();
    const encodedAction = this.actions[0].serializeBinary();
    return `${this.interruptNr}${encodedAddr}${this.moment}${encodedSchedule}${encodedAction}\n`;
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

      for (let i = 0; i < this.actions.length; i++) {
        const action = this.actions[i];
        if (
          action.parseSubscriptionData !== undefined &&
          action.onSubscriptionData !== undefined
        ) {
          try {
            const parsed = action.parseSubscriptionData(subContent.val);
            action.onSubscriptionData(parsed);
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
}
