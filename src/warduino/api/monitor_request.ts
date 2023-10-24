import { getGlobalLogger } from '../../logger/logger';
import { encodeLEB128ToHex } from '../../util/encoder';
import {
  Instruction,
  APIRequestInvalidParse,
  getInstructionFromString,
  APISubscriptionRequest,
} from './request_interface';

import { type InstrumentAction } from '../../instrumentor/action';

enum MonitorMoment {
  MonitorBefore = '01',
  MonitorAfter = '02',
}

export interface MonitorWasmAddrJSONResponse {
  interrupt: string;
  kind: string;
  error_code?: string;
}
export enum ResponseType {
  SuccessResponse = '01',
  ErrorResponse = '02',
}

function getResponseTypeFromString(str: string): ResponseType | undefined {
  switch (str) {
    case '01':
      return ResponseType.SuccessResponse;
    case '02':
      return ResponseType.ErrorResponse;
    default:
      return undefined;
  }
}

export interface MonitorWasmAddrResponse {
  interrupt: Instruction;
  responseType: ResponseType;
  error_code?: number;
}

export function createMonitorWasmAddrResponse(
  obj: MonitorWasmAddrJSONResponse,
): MonitorWasmAddrResponse | undefined {
  const instr = getInstructionFromString(obj.interrupt);
  const responseType = getResponseTypeFromString(obj.kind);
  if (
    instr === undefined ||
    responseType === undefined ||
    instr !== Instruction.MonitorWasmAddr
  ) {
    return undefined;
  }

  const reply: MonitorWasmAddrResponse = {
    interrupt: instr,
    responseType,
  };
  if (obj.error_code !== undefined) {
    const code = parseInt(obj.error_code);
    if (!isNaN(code)) {
      return undefined;
    }
    reply.error_code = code;
  }

  return reply;
}
export function isSuccessfulReply(reply: MonitorWasmAddrResponse): boolean {
  return reply.responseType === ResponseType.SuccessResponse;
}

export function isMonitorWasmAddrResponse(
  content: any,
): content is MonitorWasmAddrJSONResponse {
  const validFields =
    typeof content === 'object' &&
    typeof content.interrupt === 'string' &&
    typeof content.kind === 'string' &&
    (typeof content.error_code === 'string' ||
      content.error_code === undefined);
  if (validFields) {
    return content.interrupt === Instruction.MonitorWasmAddr;
  }
  return false;
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
