import { encodeToHexLEB128 } from '../../../util/encoder';
import { WASM } from '../../../webassembly/wasm';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import { isErrorMessage, RequestMessage } from '../../request_msg';
import { Instruction } from './instructions';

export enum HookAroundKind {
  // The hooked instruction. For `block`, `loop` and if we use the whole structure to the `end`
  Instruction = '00',

  // around the whole function
  Function = '01',
}

export const hookAroundResultErrors = new Map<number, string>([
  [1, 'wrong interrupt number'],
  [2, 'invalid around kind'],
  [3, 'invalid result value'],
  [4, 'VM is not paused'],
  [5, 'no around hook registered on the address'],
  [6, 'VM is not paused on the hooked address'],
  [7, 'hooked address is not the start of the current function'],
  [8, 'instruction cannot be replaced by an around hook'],
  [9, 'stack underflow while popping the arguments'],
  [10, 'result does not match the expected result type'],
  [11, 'stack overflow while pushing the result'],
]);

// Request only send while the VM is paused on an around hook.
export class HookAroundResultRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.HookAroundResult;

  constructor(
    public readonly wasmAddr: number,
    public readonly kind: HookAroundKind,
    public readonly nrArgs: number,
    public readonly result?: WASM.Value,
  ) {
    super();
  }

  description(): string {
    return `HookAroundResultRequest for addr ${this.wasmAddr}`;
  }

  getData(): string {
    const addr = encodeToHexLEB128(this.wasmAddr);
    const nrArgs = encodeToHexLEB128(this.nrArgs);
    let result = '00';
    if (this.result !== undefined) {
      const type = WASM.typeToHex.get(this.result.type);
      if (type === undefined) {
        throw new Error(
          `Cannot encode around result of type ${WASM.typeToString(this.result.type)}`,
        );
      }
      const value = WASM.encodeWasmValue(this.result, {
        includeIndex: false,
        includeType: false,
      });
      result = `01${type}${value}`;
    }
    return `${this.instruction}${this.serializeID()}${addr}${this.kind}${nrArgs}${result}\n`;
  }

  parse(_input: string): boolean {
    throw new APIRequestInvalidParse('No reply for HookAroundResultRequest');
  }

  processAck(ack: RequestMessage): boolean {
    if (ack.interrupt !== this.instruction) {
      throw new APIRequestInvalidParse('No reply for HookAroundResultRequest');
    }
    return !isErrorMessage(ack);
  }
}
