import { WASM } from '../state/wasm';
import { encodeLEB128ToHex } from '../util/encoder';
import {
  type HookSchedule,
  ScheduleAways,
  ScheduleOnTimeStamp,
  ScheduleOnce,
} from './schedule';
import { type TimeStamp } from './timestamp';
import { type StateRequest } from '../warduino/requests/inspect_request';

export enum HookKind {
  RemoteCall = '01',
  ValueSubstitution = '02',
  StateToInspect = '03',
}

export abstract class InstrumentHook<SubscriptionType> {
  public readonly kind: HookKind;
  public schedule: HookSchedule;
  constructor(kind: HookKind) {
    this.kind = kind;
    this.schedule = new ScheduleAways();
  }

  scheduleFor(newSchedule: HookSchedule): InstrumentHook<SubscriptionType> {
    this.schedule = newSchedule;
    return this;
  }

  scheduleOnce(timestamp?: TimeStamp): InstrumentHook<SubscriptionType> {
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

export abstract class HookWithoutSubscription extends InstrumentHook<void> {}

export class RemoteCallHook extends HookWithoutSubscription {
  public readonly targetfidx: number;
  constructor(targetfidx: number) {
    super(HookKind.RemoteCall);
    this.targetfidx = targetfidx;
  }

  serializeBinary(): string {
    // format: HookKind (1 BYTE) | target fidx (LEB128)
    const target = encodeLEB128ToHex(this.targetfidx);
    return `${this.kind}${target}`;
  }
}

export class ValueSubstitution extends HookWithoutSubscription {
  public readonly value?: WASM.Value;
  constructor(value?: WASM.Value) {
    super(HookKind.ValueSubstitution);
    this.value = value;
  }

  serializeBinary(): string {
    // format: HookKind (1 Byte) | HasValue (1 Byte) | Value
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

export class InspectState extends InstrumentHook<WasmState> {
  private readonly req: StateRequest;
  public readonly wasmAddress?: number;
  constructor(stateRequest: StateRequest, wasmAddress?: number) {
    super(HookKind.StateToInspect);
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
