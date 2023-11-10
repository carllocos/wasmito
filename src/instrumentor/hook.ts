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

export interface WASMValueIndexed extends WASM.Value {
  idx: number;
}

export interface WasmState {
  pc?: number;
  breakpoints?: number[];
  stack?: WASMValueIndexed[];
  callstack?: WASM.Frame[];
  globals?: WASMValueIndexed[];
  table?: WASM.Table;
  memory?: WASM.Memory;
  br_table?: WASM.BRTable;
  callbacks?: WASM.CallbackMapping[];
  events?: WASM.Event[];
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
    const state: WasmState = {};
    if (parsed.pc !== undefined) {
      state.pc = parsed.pc;
    }
    if (parsed.breakpoints !== undefined) {
      state.breakpoints = parsed.breakpoints;
    }
    if (parsed.stack !== undefined) {
      state.stack = parsed.stack.map(
        (sv: { idx: number; type: string; value: number }) => {
          return {
            idx: sv.idx,
            type: WASM.typing.get(sv.type),
            value: sv.value,
          };
        },
      );
    }

    if (parsed.globals !== undefined) {
      state.globals = parsed.globals.map(
        (gv: { idx: number; type: string; value: number }) => {
          return {
            idx: gv.idx,
            type: WASM.typing.get(gv.type),
            value: gv.value,
          };
        },
      );
    }

    if (parsed.callstack !== undefined) {
      state.callstack = parsed.callstack;
    }
    if (parsed.table !== undefined) {
      getGlobalLogger().error(
        `TODO: handle the case where table is present in inspectedState`,
      );
    }
    if (parsed.memory !== undefined) {
      getGlobalLogger().error(
        `TODO: handle the case where memory is present in inspectedState`,
      );
    }
    if (parsed.br_table !== undefined) {
      getGlobalLogger().error(
        `TODO: handle the case where br_table is present in inspectedState`,
      );
    }
    if (parsed.callbacks !== undefined) {
      getGlobalLogger().error(
        `TODO: handle the case where callbacks are present in inspectedState`,
      );
    }
    if (parsed.events !== undefined) {
      getGlobalLogger().error(
        `TODO: handle the case where events are present in inspectedState`,
      );
    }
    return state;
  }
}
