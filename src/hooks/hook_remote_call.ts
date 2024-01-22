import { encodeToHexLEB128 } from '../util/encoder';
import { HookWithoutSubscription, HookKind } from './hook';

export class RemoteCallHook extends HookWithoutSubscription {
  public readonly targetfidx: number;
  constructor(targetfidx: number) {
    super(HookKind.RemoteCall);
    this.targetfidx = targetfidx;
  }

  serializeBinary(): string {
    // format: HookKind (1 BYTE) | target fidx (LEB128)
    const target = encodeToHexLEB128(this.targetfidx);
    return `${this.kind}${target}`;
  }

  description(): string {
    return `RemoteCallHook ${this.targetfidx}`;
  }
}
