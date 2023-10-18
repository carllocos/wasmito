import { getGlobalLogger } from '../../logger/logger';
import { WASM } from '../../state/wasm';
import { encodeLEB128ToHex } from '../../util/encoder';
import {
  type APIRequest,
  Instruction,
  APIRequestInvalidParse,
  getInstructionFromString,
} from './request_interface';

enum ScheduleKind {
  ScheduleOnce = '01', // action run once and as soon as possible
  ScheduleAlways = '03', // action runs everytime when needed
  ScheduleOnTimeStamp = '21', // action executed on timestamp
  ScheduleBeforeTimeStamp = '22', // action executed before timestamp
  ScheduleAfterTimeStamp = '23', // action executed after timestamp
}

export abstract class ActionSchedule {
  public readonly scheduleKind: ScheduleKind;
  constructor(scheduleKind: ScheduleKind) {
    this.scheduleKind = scheduleKind;
  }

  serializeBinary(): string {
    return `${this.scheduleKind}`;
  }
}

export class ScheduleOnce extends ActionSchedule {
  constructor() {
    super(ScheduleKind.ScheduleOnce);
  }
}

export class ScheduleAways extends ActionSchedule {
  constructor() {
    super(ScheduleKind.ScheduleAlways);
  }
}

type TimeStamp = [number, number]; // [nr of instructions, nr of events]

export function timeStampNrOfInstructions(t: TimeStamp): number {
  return t[0];
}

export function timeStampNrOfEvents(t: TimeStamp): number {
  return t[1];
}

export function newTimeStamp(nrOfIstr: number, nrOfevents: number): TimeStamp {
  return [nrOfIstr, nrOfevents];
}

export abstract class TimeStampScheduling extends ActionSchedule {
  public readonly timestamp: TimeStamp;
  constructor(scheduleKind: ScheduleKind, timestamp: TimeStamp) {
    super(scheduleKind);
    this.timestamp = timestamp;
  }

  serializeBinary(): string {
    // format expected: SCHEDULE_KIND (1 BYTE)
    // format timestamp: nr of instructions (LEB32) | nr of events (LEB32);
    const nrOfInstr = timeStampNrOfInstructions(this.timestamp);
    const instrAsHex = encodeLEB128ToHex(nrOfInstr);
    const nrOfEvents = timeStampNrOfEvents(this.timestamp);
    const evtsAsHex = encodeLEB128ToHex(nrOfEvents);
    return `${this.scheduleKind}${instrAsHex}${evtsAsHex}`;
  }
}

export class ScheduleOnTimeStamp extends TimeStampScheduling {
  constructor(timestamp: TimeStamp) {
    super(ScheduleKind.ScheduleOnTimeStamp, timestamp);
  }
}

export class ScheduleBeforeTimeStamp extends TimeStampScheduling {
  constructor(timestamp: TimeStamp) {
    super(ScheduleKind.ScheduleBeforeTimeStamp, timestamp);
  }
}

export class ScheduleAfterTimeStamp extends TimeStampScheduling {
  constructor(timestamp: TimeStamp) {
    super(ScheduleKind.ScheduleAfterTimeStamp, timestamp);
  }
}

enum ActionKind {
  RemoteCall = '01',
  ValueSubstitution = '02',
}

export abstract class InstrumentAction {
  public readonly kind: ActionKind;
  public schedule: ActionSchedule;
  constructor(kind: ActionKind) {
    this.kind = kind;
    this.schedule = new ScheduleAways();
  }

  scheduleFor(newSchedule: ActionSchedule): InstrumentAction {
    this.schedule = newSchedule;
    return this;
  }

  scheduleOnce(timestamp?: TimeStamp): InstrumentAction {
    if (timestamp !== undefined) {
      this.schedule = new ScheduleOnTimeStamp(timestamp);
    } else {
      this.schedule = new ScheduleOnce();
    }
    return this;
  }

  abstract serializeBinary(): string;
}

export class RemoteCallAction extends InstrumentAction {
  public readonly targetfidx: number;
  constructor(targetfidx: number) {
    super(ActionKind.RemoteCall);
    this.targetfidx = targetfidx;
  }

  serializeBinary(): string {
    // format: ActionKind (1 BYTE) | target fidx (LEB128)
    const target = encodeLEB128ToHex(this.targetfidx);
    return `${this.kind}${target}`;
  }
}

export class ValueSubstitution extends InstrumentAction {
  public readonly value?: WASM.Value;
  constructor(value?: WASM.Value) {
    super(ActionKind.ValueSubstitution);
    this.value = value;
  }

  serializeBinary(): string {
    // format: ActionKind (1 Byte) | HasValue (1 Byte) | Value
    let valueEncoded = '';
    let hasValue = '00';
    if (this.value !== undefined) {
      hasValue = '01';
      valueEncoded = WASM.encodeWasmValue(this.value, {
        includeType: true,
      });
    }
    return `${this.kind}${hasValue}${valueEncoded}`;
  }
}

export class EmptyValueSubstitution extends ValueSubstitution {
  constructor() {
    super(undefined);
  }
}

export interface AroundFunctionJSONResponse {
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

export interface AroundActionResponse {
  interrupt: Instruction;
  responseType: ResponseType;
  error_code?: number;
}

export function createAroundFunctionResponse(
  obj: AroundFunctionJSONResponse,
): AroundActionResponse | undefined {
  const instr = getInstructionFromString(obj.interrupt);
  const responseType = getResponseTypeFromString(obj.kind);
  if (
    instr === undefined ||
    responseType === undefined ||
    instr !== Instruction.AroundFunction
  ) {
    return undefined;
  }

  const reply: AroundActionResponse = {
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
export function isSuccessfulReply(reply: AroundActionResponse): boolean {
  return reply.responseType === ResponseType.SuccessResponse;
}

export function isAroundFunctionJSONResponse(
  content: any,
): content is AroundFunctionJSONResponse {
  const validFields =
    typeof content === 'object' &&
    typeof content.interrupt === 'string' &&
    typeof content.kind === 'string' &&
    (typeof content.error_code === 'string' ||
      content.error_code === undefined);
  if (validFields) {
    return content.interrupt === Instruction.AroundFunction;
  }
  return false;
}

export class AroundFunctionRequest implements APIRequest<AroundActionResponse> {
  public readonly function_idx;
  public readonly actions: InstrumentAction[];
  constructor(fidx: number) {
    this.function_idx = fidx;
    this.actions = [];
  }

  addAction(action: InstrumentAction): AroundFunctionRequest {
    if (this.actions.length === 0) {
      this.actions.push(action);
    } else {
      getGlobalLogger().debug(
        'Todo support multiple actions. For now just one action',
      );
    }
    return this;
  }

  getData(): string {
    const encodedFidx = encodeLEB128ToHex(this.function_idx);
    const encodedSchedule = this.actions[0].schedule.serializeBinary();
    const encodedAction = this.actions[0].serializeBinary();
    return `${Instruction.AroundFunction}${encodedFidx}${encodedSchedule}${encodedAction}\n`;
  }

  parse(input: string): AroundActionResponse {
    const err = new APIRequestInvalidParse(
      'No reply for AroundFunctionRequest',
    );
    const obj = JSON.parse(input);
    if (isAroundFunctionJSONResponse(obj)) {
      const reply = createAroundFunctionResponse(obj);
      if (reply === undefined) {
        throw err;
      } else {
        return reply;
      }
    } else {
      throw err;
    }
  }
}
