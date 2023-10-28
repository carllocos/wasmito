import { getGlobalLogger } from '../../logger/logger';
import { encodeLEB128ToHex } from '../../util/encoder';
import {
  APIRequestInvalidParse,
  APISubscriptionRequest,
} from '../api/request_interface';
import { type InstrumentAction } from '../../instrumentor/action';
import { Instruction, getInstructionFromString } from '../api/instructions';

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
    const err = new APIRequestInvalidParse(
      'No reply for AroundFunctionRequest',
    );
    const obj = JSON.parse(input);
    if (isMonitorWasmAddrResponse(obj)) {
      const reply = createMonitorWasmAddrResponse(obj);
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
    for (let i = 0; i < this.actions.length; i++) {
      const action = this.actions[i];
      if (
        action.parseSubscriptionData !== undefined &&
        action.onSubscriptionData !== undefined
      ) {
        try {
          const response = action.parseSubscriptionData(data);
          action.onSubscriptionData(response);
        } catch (e) {}
      }
    }
  }
}
