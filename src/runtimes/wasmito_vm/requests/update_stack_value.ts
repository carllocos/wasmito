import { encodeToHexLEB128 } from '../../../util/encoder';
import { WASM } from '../../../webassembly/wasm';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import { RequestMessage } from '../../request_msg';
import { Instruction } from './instructions';

export class UpdateStackValueRequest extends APIRequestNoSubscription<boolean> {
  private stackIdx: number;
  private value: WASM.Value;
  readonly instruction: Instruction;

  constructor(stackIdx: number, value: WASM.Value) {
    super();
    this.stackIdx = stackIdx;
    this.value = value;
    this.instruction = Instruction.updateStackValue;
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
    return `${this.instruction}${this.serializeID()}${idx}${encoding}\n`;
  }

  parse(input: string): boolean {
    if (input === `StackValue ${this.stackIdx} changed`) {
      return true;
    }
    throw new APIRequestInvalidParse('No ack for Pause');
  }
}
