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
  ChangeRunningState = '04',
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
      if (isNaN(parsed.table.max)) {
        throw new Error(`Table max isNaN ${parsed.table.max}`);
      }

      if (isNaN(parsed.table.init)) {
        throw new Error(`Table init isNaN ${parsed.table.init}`);
      }
      state.table = {
        max: parsed.table.max,
        init: parsed.table.init,
        elements: parsed.table.elements.map((v: any) => {
          if (isNaN(v)) {
            throw new Error(`Table element isNaN ${v}`);
          }
          return v;
        }),
      };
    }
    if (parsed.memory !== undefined) {
      if (isNaN(parsed.memory.pages)) {
        throw new Error(`Memory pages isNaN ${parsed.memory.pages}`);
      }
      if (isNaN(parsed.memory.max)) {
        throw new Error(`Memory max isNaN ${parsed.memory.max}`);
      }
      if (isNaN(parsed.memory.init)) {
        throw new Error(`Memory init isNaN ${parsed.memory.init}`);
      }
      const memBytes = Uint8Array.from(parsed.memory.bytes);
      if (memBytes === undefined) {
        throw new Error(`Memory bytes are invalid ${parsed.memory.bytes}`);
      }
      state.memory = {
        pages: parsed.memory.pages,
        max: parsed.memory.max,
        init: parsed.memory.init,
        bytes: memBytes,
      };
    }
    if (parsed.br_table !== undefined) {
      const brTableSize = parseInt(parsed.br_table.size, 16);
      if (isNaN(brTableSize)) {
        throw new Error(`Invalid BR_table size ${parsed.br_table.size}`);
      }
      state.br_table = {
        size: brTableSize,
        labels: parsed.br_table.labels.map((v: any) => {
          if (isNaN(v)) {
            throw new Error(`Invalid BR_table label is NaN ${v}`);
          }
          return v;
        }),
      };
    }
    if (parsed.callbacks !== undefined) {
      state.callbacks = parsed.callbacks.map((cb: any) => {
        if (isNaN(cb.callbackid)) {
          throw new Error(`Callback id is NaN ${cb.callbackid}`);
        }
        return {
          callbackid: cb.callbackid,
          tableIndexes: cb.tableIndexes.map((i: any) => {
            if (isNaN(i)) {
              throw new Error(`Callback index is NaN ${i}`);
            }
            return i;
          }),
        };
      });
    }
    if (parsed.events !== undefined) {
      state.events = parsed.events.map((ev: any) => {
        if (typeof ev.topic !== 'string') {
          throw new Error(`event topic should be string got ${ev.topic}`);
        }

        if (typeof ev.payload !== 'string') {
          throw new Error(`event topic should be string got ${ev.topic}`);
        }
        return {
          topic: ev.topic,
          payload: ev.payload,
        };
      });
    }
    return state;
  }
}

export enum WARDuinoRunState {
  WARDuinoRun = '02',
  WARDuinoPause = '03',
}

export class ChangeRunningStateHook extends HookWithoutSubscription {
  public readonly runState: WARDuinoRunState;
  constructor(runState: WARDuinoRunState) {
    super(HookKind.ChangeRunningState);
    this.runState = runState;
  }

  serializeBinary(): string {
    // format: HookKind (1 BYTE) | RunState (1 BYTE)
    return `${this.kind}${this.runState}`;
  }
}

export class PauseVMHook extends ChangeRunningStateHook {
  constructor() {
    super(WARDuinoRunState.WARDuinoPause);
  }
}

export class RunVMHook extends ChangeRunningStateHook {
  constructor() {
    super(WARDuinoRunState.WARDuinoRun);
  }
}
