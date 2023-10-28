export class WasmType {
  public readonly nrArgs: number;
  public readonly nrResults: number;
  public readonly id?: number;

  constructor(nrArgs: number, nrResults: number, id?: number) {
    this.nrArgs = nrArgs;
    this.nrResults = nrResults;
    this.id = id;
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
