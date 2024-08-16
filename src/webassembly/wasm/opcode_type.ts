import { type WASM } from '../wasm';

export class WasmType {
  public readonly nrArgs: number;
  private _args: WASM.Type[];
  public readonly nrResults: number;
  private _returnTypes: WASM.Type[];
  public readonly id?: number;

  constructor(nrArgs: number, nrResults: number, id?: number) {
    this.nrArgs = nrArgs;
    this.nrResults = nrResults;
    this.id = id;
    this._args = [];
    this._returnTypes = [];
  }

  get args(): WASM.Type[] {
    return this._args;
  }

  set args(a: WASM.Type[]) {
    this._args = a;
  }

  get returnTypes(): WASM.Type[] {
    return this._returnTypes;
  }

  set returnTypes(a: WASM.Type[]) {
    this._returnTypes = a;
  }

  public hasResult(): boolean {
    return this.nrResults > 0;
  }
}

export class PlaceholderType extends WasmType {
  constructor() {
    super(0, 0);
  }
}
