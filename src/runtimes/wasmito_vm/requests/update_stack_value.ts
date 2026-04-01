import { encodeToHexLEB128 } from '../../../util/encoder';
import { WASM } from '../../../webassembly/wasm';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import { Instruction } from './instructions';

export class UpdateStackValueRequest extends APIRequestNoSubscription<boolean> {
  private stackIdx: number;
  private value: WASM.Value;

  constructor(stackIdx: number, value: WASM.Value) {
    super();
    this.stackIdx = stackIdx;
    this.value = value;
  }

  description(): string {
    return 'UpdateStackValueRequest';
  }

  getData(): string {
    const idx = encodeToHexLEB128(this.stackIdx);
    const encoding = WASM.encodeWasmValue(this.value, {
      includeIndex: false,
      includeType: false,
    });
    return `${Instruction.updateStackValue}${idx}${encoding}\n`;
  }

  parse(input: string): boolean {
    if (input === `StackValue ${this.stackIdx} changed`) {
      return true;
    }
    throw new APIRequestInvalidParse('No ack for Pause');
  }
}
