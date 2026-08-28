import assert from 'assert';
import { WASM } from '../webassembly/wasm';
import { WASMFunction, WasmModule } from '../webassembly';

export class WritableInterrupt {
  private _topic: string;
  private _payload: string;

  constructor(topic: string, payload: string);
  constructor(ev: WASM.Event);
  constructor(...args: any[]) {
    if (args.length === 2) {
      this._topic = args[0];
      this._payload = args[1];
    } else {
      this._topic = args[0].topic;
      this._payload = args[0].payload;
    }
  }

  get topic(): string {
    return this._topic;
  }

  set topic(t: string) {
    this._topic = t;
  }

  get payload(): string {
    return this._payload;
  }

  set payload(p: string) {
    this._payload = p;
  }
}

export class ReadOnlyInterrupt {
  private _topic: string;
  private _payload: string;

  constructor(topic: string, payload: string);
  constructor(ev: WASM.Event);
  constructor(...args: any[]) {
    if (args.length === 2) {
      this._topic = args[0];
      this._payload = args[1];
    } else {
      this._topic = args[0].topic;
      this._payload = args[0].payload;
    }
  }

  get topic(): string {
    return this._topic;
  }

  get payload(): string {
    return this._payload;
  }
}

export class ReadOnlyWasmValue {
  protected _value: number | bigint;
  protected _type: WASM.Type;
  protected _stackIdx: number;

  constructor(type: WASM.Type, value: number | bigint, stackIdx = -1) {
    this._value = value;
    this._type = type;
    this._stackIdx = stackIdx;
  }

  get type(): WASM.Type {
    return this._type;
  }

  get value(): number | bigint {
    return this._value;
  }

  get stackIdx(): number {
    if (this._stackIdx < 0) {
      throw new Error(`No Stack Index set for ReadableWasmValue`);
    }
    return this._stackIdx;
  }

  toWasmValue(): WASM.Value {
    return {
      value: this.value,
      type: this.type,
    };
  }

  static new(
    type: WASM.Type,
    value: number | bigint,
    stackIdx = -1,
  ): ReadOnlyWasmValue {
    switch (type) {
      case WASM.Type.i64:
        return new ReadOnlyI64Const(value, stackIdx);
      default:
        assert(
          typeof value === 'number',
          `value is expected to be a number. Value is currently ${typeof value}`,
        );
        switch (type) {
          case WASM.Type.i32:
            return new ReadOnlyI32Const(value, stackIdx);
          case WASM.Type.f32:
            return new ReadOnlyF32Const(value, stackIdx);
          case WASM.Type.f64:
            return new ReadOnlyF64Const(value, stackIdx);
          default:
            throw new Error(`cannot create Wasm const with type ${type}`);
        }
    }
  }

  static isI32Const(v: WritableWasmValue): v is WritableI32Const {
    return v instanceof WritableI32Const;
  }

  static isI64Const(v: WritableWasmValue): v is WritableI64Const {
    return v instanceof WritableI64Const;
  }

  static isF32Const(v: WritableWasmValue): v is WritableF32Const {
    return v instanceof WritableF32Const;
  }

  static isF64Const(v: WritableWasmValue): v is WritableF64Const {
    return v instanceof WritableF64Const;
  }
}

export class ReadOnlyI32Const extends ReadOnlyWasmValue {
  constructor(value: number, stackIdx = -1) {
    super(WASM.Type.i32, value, stackIdx);
  }

  get value(): number {
    return this._value as number;
  }
}

export class ReadOnlyI64Const extends ReadOnlyWasmValue {
  constructor(value: number | bigint, stackIdx = -1) {
    super(WASM.Type.i64, value, stackIdx);
  }
}

export class ReadOnlyF32Const extends ReadOnlyWasmValue {
  constructor(value: number, stackIdx = -1) {
    super(WASM.Type.f32, value, stackIdx);
  }

  get value(): number {
    return this._value as number;
  }
}

export class ReadOnlyF64Const extends ReadOnlyWasmValue {
  constructor(value: number, stackIdx = -1) {
    super(WASM.Type.f64, value, stackIdx);
  }

  get value(): number {
    return this._value as number;
  }
}

export class WritableWasmValue {
  protected _value: number | bigint;
  protected _type: WASM.Type;
  protected _stackIdx: number;
  constructor(type: WASM.Type, value: number | bigint, stackIdx = -1) {
    this._value = value;
    this._type = type;
    this._stackIdx = stackIdx;
  }

  get stackIdx(): number {
    if (this._stackIdx < 0) {
      throw new Error(`No Stack Index set for WritableWasmValue`);
    }
    return this._stackIdx;
  }

  get type(): WASM.Type {
    return this._type;
  }

  get value(): number | bigint {
    return this._value;
  }

  set value(n: number | bigint) {
    // TODO validate assignment
    this._value = n;
  }

  toWasmValue(): WASM.Value {
    return {
      value: this.value,
      type: this.type,
    };
  }

  static new(
    type: WASM.Type,
    value: number | bigint,
    stackIdx = -1,
  ): WritableWasmValue {
    switch (type) {
      case WASM.Type.i64:
        return new WritableI64Const(value, stackIdx);
      default:
        assert(
          typeof value === 'number',
          `value is expected to be a number. Value is currently ${typeof value}`,
        );
        switch (type) {
          case WASM.Type.i32:
            return new WritableI32Const(value, stackIdx);
          case WASM.Type.f32:
            return new WritableF32Const(value, stackIdx);
          case WASM.Type.f64:
            return new WritableF64Const(value, stackIdx);
          default:
            throw new Error(`cannot create Wasm const with type ${type}`);
        }
    }
  }

  static isI32Const(v: WritableWasmValue): v is WritableI32Const {
    return v instanceof WritableI32Const;
  }

  static isI64Const(v: WritableWasmValue): v is WritableI64Const {
    return v instanceof WritableI64Const;
  }

  static isF32Const(v: WritableWasmValue): v is WritableF32Const {
    return v instanceof WritableF32Const;
  }

  static isF64Const(v: WritableWasmValue): v is WritableF64Const {
    return v instanceof WritableF64Const;
  }
}

export class WritableI32Const extends WritableWasmValue {
  constructor(value: number, stackIdx = -1) {
    super(WASM.Type.i32, value, stackIdx);
  }

  get value(): number {
    return this._value as number;
  }

  set value(n: number) {
    this._value = n;
  }
}

export class WritableI64Const extends WritableWasmValue {
  constructor(value: number | bigint, stackIdx = -1) {
    super(WASM.Type.i64, value, stackIdx);
  }
}

export class WritableF32Const extends WritableWasmValue {
  constructor(value: number, stackIdx = -1) {
    super(WASM.Type.f32, value, stackIdx);
  }

  get value(): number {
    return this._value as number;
  }

  set value(n: number) {
    this._value = n;
  }
}

export class WritableF64Const extends WritableWasmValue {
  constructor(value: number, stackIdx = -1) {
    super(WASM.Type.f64, value, stackIdx);
  }

  get value(): number {
    return this._value as number;
  }

  set value(n: number) {
    this._value = n;
  }
}

export interface PinInterruptHandler extends WASM.CallbackMapping {
  pin: number;
  handlers: WASMFunction[];
}

export function callbackMappingToPinInterruptHandler(
  wasm: WasmModule,
  table: WASM.Table,
  cbm: WASM.CallbackMapping,
): PinInterruptHandler {
  const pin = WASM.interruptTopicToPinNumber(cbm.callbackid);
  assert(
    pin !== undefined,
    `Failed to convert topic '${cbm.callbackid}' to a pin number`,
  );

  const funcs: WASMFunction[] = [];
  for (const idx of cbm.tableIndexes) {
    const funID = table.elements[idx];
    assert(funID !== undefined, `No function found for table index ${idx}`);
    const f = wasm.getFunction(funID);
    assert(
      f !== undefined,
      `No function found in the Wasm module with ID ${funID}`,
    );
    funcs.push(f);
  }

  return {
    callbackid: cbm.callbackid,
    tableIndexes: cbm.tableIndexes,
    pin,
    handlers: funcs,
  };
}
