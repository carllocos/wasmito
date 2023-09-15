import { WASM } from "./wasm";

export class WasmStack {
    private values: WASM.Value[];
    constructor(stack: WASM.Value[]) {
        this.values = stack
    }
}