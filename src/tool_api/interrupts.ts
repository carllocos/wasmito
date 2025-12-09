import { WASM } from '../webassembly/wasm';

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
  constructor(v: WASM.Value) {
    this.v = v;
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
