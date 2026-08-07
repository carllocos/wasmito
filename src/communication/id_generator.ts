import { WASM } from '../webassembly/wasm';

export type RequestID = number;
export class IDGenerator {
  private _id: RequestID = 0;
  newID(): RequestID {
    const id = this._id;
    this._id += 1;
    return id;
  }

  serialiseIDToLEBHex(id: RequestID): string {
    return WASM.leb128(id);
  }
}
