import { type WASM } from './wasm'

export class WasmStack {
  private readonly values: WASM.Value[]
  constructor (stack: WASM.Value[]) {
    this.values = stack
  }
}
