import { type WASM } from '../wasm';

export class WasmType {
  private _nrArgs: number;
  private _args: WASM.Type[];
  private _nrResults: number;
  private _returnTypes: WASM.Type[];
  public readonly id?: number;

  constructor(nrArgs: number, nrResults: number, id?: number) {
    this._nrArgs = nrArgs;
    this._nrResults = nrResults;
    this.id = id;
    this._args = [];
    this._returnTypes = [];
  }

  get args(): WASM.Type[] {
    return this._args;
  }

  set args(a: WASM.Type[]) {
    this._args = a;
    this._nrArgs = a.length;
  }

  get nrArgs(): number {
    return this._nrArgs;
  }

  get nrResults(): number {
    return this._nrResults;
  }

  get returnTypes(): WASM.Type[] {
    return this._returnTypes;
  }

  set returnTypes(a: WASM.Type[]) {
    this._returnTypes = a;
    this._nrResults = a.length;
  }

  public hasResult(): boolean {
    return this.nrResults > 0;
  }

  public toJSONObj(): object {
    return {
      id: this.id ?? -1,
      nrArgs: this.nrArgs,
      args: this.args,
      nrResults: this.nrResults,
      returnTypes: this.returnTypes,
    };
  }
}

export class PlaceholderType extends WasmType {
  constructor() {
    super(0, 0);
  }
}
