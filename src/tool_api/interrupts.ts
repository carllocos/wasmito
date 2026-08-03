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
  protected v: WASM.Value;
  private _stackIdx: number;

  constructor(v: WASM.Value, stackIdx = -1) {
    this.v = v;
    this._stackIdx = stackIdx;
  }

  get type(): WASM.Type {
    return this.v.type;
  }

  get value(): number {
    return this.v.value;
  }

  get stackIdx(): number {
    if (this._stackIdx < 0) {
      throw new Error(`No Stack Index set for ReadableWasmValue`);
    }
    return this._stackIdx;
  }
}

export class WritableWasmValue {
  protected v: WASM.Value;
  private _stackIdx: number;
  constructor(v: WASM.Value, stackIdx = -1) {
    this.v = v;
    this._stackIdx = stackIdx;
  }

  get stackIdx(): number {
    if (this._stackIdx < 0) {
      throw new Error(`No Stack Index set for WritableWasmValue`);
    }
    return this._stackIdx;
  }

  get type(): WASM.Type {
    return this.v.type;
  }

  get value(): number {
    return this.v.value;
  }

  set value(n: number) {
    // TODO validate assignment
    this.v.value = n;
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
