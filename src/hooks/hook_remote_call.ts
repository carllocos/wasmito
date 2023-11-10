import { encodeLEB128ToHex } from '../util/encoder';
import { HookWithoutSubscription, HookKind } from './hook';

export class RemoteCallHook extends HookWithoutSubscription {
  public readonly targetfidx: number;
  constructor(targetfidx: number) {
    super(HookKind.RemoteCall);
    this.targetfidx = targetfidx;
  }

  serializeBinary(): string {
    // format: HookKind (1 BYTE) | target fidx (LEB128)
    const target = encodeLEB128ToHex(this.targetfidx);
    return `${this.kind}${target}`;
  }
}
