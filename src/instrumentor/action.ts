import { WASM } from '../state/wasm';
import { encodeLEB128ToHex } from '../util/encoder';
import {
  type ActionSchedule,
  ScheduleAways,
  ScheduleOnTimeStamp,
  ScheduleOnce,
} from '../instrumentor/schedule';
import { type TimeStamp } from '../instrumentor/timestamp';
import { type StateRequest } from '../warduino/api/inspect_request';

export enum ActionKind {
  RemoteCall = '01',
  ValueSubstitution = '02',
  StateToInspect = '03',
}

export abstract class InstrumentAction<SubscriptionType> {
  public readonly kind: ActionKind;
  public schedule: ActionSchedule;
  constructor(kind: ActionKind) {
    this.kind = kind;
    this.schedule = new ScheduleAways();
  }

  scheduleFor(newSchedule: ActionSchedule): InstrumentAction<SubscriptionType> {
    this.schedule = newSchedule;
    return this;
  }

  scheduleOnce(timestamp?: TimeStamp): InstrumentAction<SubscriptionType> {
    if (timestamp !== undefined) {
      this.schedule = new ScheduleOnTimeStamp(timestamp);
    } else {
      this.schedule = new ScheduleOnce();
    }
    return this;
  }

  abstract serializeBinary(): string;
  parseSubscriptionData?: (input: string) => SubscriptionType;
  onSubscriptionData?: (data: SubscriptionType) => void;
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

export class StateInspect extends InstrumentAction {
  private readonly req: StateRequest;
  constructor(stateRequest: StateRequest) {
    super(ActionKind.StateToInspect);
    this.req = stateRequest;
  }

  public serializeBinary(): string {
    return `${this.kind}${this.req.generateInterrupt()}`;
  }
}
