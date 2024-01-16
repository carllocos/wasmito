import { WASM } from '../../src/state/wasm';

export class WasmValuesBuilder {
  private readonly _values: WASM.Value[];
  constructor() {
    this._values = [];
  }

  get values(): WASM.Value[] {
    return this._values;
  }

  addValue(type: WASM.Type, value: number): WasmValuesBuilder {
    this._values.push({
      type,
      value,
    });
    return this;
  }

  addI32Value(value: number): WasmValuesBuilder {
    return this.addValue(WASM.Type.i32, value);
  }
}
