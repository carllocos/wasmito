import { WASM } from '../state/wasm';
import { encodeLEB128ToHex } from '../util/encoder';
import {
  type ActionSchedule,
  ScheduleAways,
  ScheduleOnTimeStamp,
  ScheduleOnce,
} from '../instrumentor/schedule';
import { type TimeStamp } from '../instrumentor/timestamp';
import { type StateRequest } from '../warduino/requests/inspect_request';

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
  parseSubscriptionData?: (input: any) => SubscriptionType;
  onSubscriptionData?: (data: SubscriptionType) => void;
}

export abstract class ActionWithoutSubscription extends InstrumentAction<void> {}

export class RemoteCallAction extends ActionWithoutSubscription {
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

export class ValueSubstitution extends ActionWithoutSubscription {
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

export interface WasmState {
  pc: number;
  stack?: any[];
  globals?: any[];
}

export class InspectState extends InstrumentAction<WasmState> {
  private readonly req: StateRequest;
  private readonly wasmAddress?: number;
  constructor(stateRequest: StateRequest, wasmAddress?: number) {
    super(ActionKind.StateToInspect);
    this.req = stateRequest;
    this.parseSubscriptionData = this.deserializeSubscriptionMessage;
    this.wasmAddress = wasmAddress;
    if (this.wasmAddress !== undefined) {
      this.req.includePC(); // include pc is mandatory
    }
  }

  public serializeBinary(): string {
    return `${this.kind}${this.req.generateInterrupt()}`;
  }

  deserializeSubscriptionMessage(input: any): WasmState {
    const parsed = this.req.parse(input);
    return {
      pc: parsed.pc,
      stack: parsed.stack,
      globals: parsed.globals,
    };
  }
}
