import assert from 'assert';
import { WASM } from '../webassembly/wasm';
import { WASMFunction, WasmModule } from '../webassembly';

export class WritableInterrupt {
  private _ev: WASM.Event;

  constructor(ev: WASM.Event) {
    this._ev = ev;
  }

  get topic(): string {
    return this._ev.topic;
  }

  set topic(t: string) {
    this._ev.topic = t;
  }

  get payload(): string {
    return this._ev.payload;
  }

  set payload(p: string) {
    this._ev.payload = p;
  }
}

export class ReadOnlyInterrupt {
  private _ev: WASM.Event;

  constructor(ev: WASM.Event) {
    this._ev = ev;
  }

  get topic(): string {
    return this._ev.topic;
  }

  get payload(): string {
    return this._ev.payload;
  }
}

export class ReadOnlyWasmValue {
  protected v: WASM.Value;
  constructor(v: WASM.Value) {
    this.v = v;
  }

  get type(): WASM.Type {
    return this.v.type;
  }

  get value(): number {
    return this.v.value;
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
