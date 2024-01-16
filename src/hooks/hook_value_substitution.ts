import { WASM } from '../state/wasm';
import { HookWithoutSubscription, HookKind } from './hook';

export class ValueSubstitution extends HookWithoutSubscription {
  public readonly value?: WASM.Value;
  constructor(value?: WASM.Value) {
    super(HookKind.ValueSubstitution);
    this.value = value;
  }

  serializeBinary(): string {
    // format: HookKind (1 Byte) | HasValue (1 Byte) | Value
    let valueEncoded = '';
    let hasValue = '00';
    if (this.value !== undefined) {
      hasValue = '01';
      valueEncoded = WASM.encodeWasmValue(this.value, {
        includeType: true,
        includeIndex: false,
      });
    }
    return `${this.kind}${hasValue}${valueEncoded}`;
  }
}

export class EmptyValueSubstitution extends ValueSubstitution {
  constructor() {
    super(undefined);
  }
}
