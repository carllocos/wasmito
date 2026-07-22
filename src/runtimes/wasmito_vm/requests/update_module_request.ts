import { encodeToHexLEB128 } from '../../../util/encoder';
import { Instruction } from './instructions';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import {
  isRequestMessage,
  RequestMessage,
  ResponseType,
} from '../../request_msg';

export class UpdateWasmModuleRequest extends APIRequestNoSubscription<boolean> {
  private readonly wasmBuffer: Buffer;
  private readonly wasm: Uint8Array;

  readonly instruction: Instruction;
  constructor(wasm: Buffer) {
    super();
    this.wasmBuffer = wasm;
    this.wasm = new Uint8Array(wasm);
    this.instruction = Instruction.UpdateWasmModule;
  }

  description(): string {
    return 'UpdateModule';
  }

  override getData(): string {
    const sizeHex = encodeToHexLEB128(this.wasm.length);
    const sizeBuffer = Buffer.allocUnsafe(4);
    sizeBuffer.writeUint32BE(this.wasm.length);
    const wasmHex = this.wasmBuffer.toString('hex');
    return `${this.instruction}${this.serializeID()}${sizeHex}${wasmHex}\n`;
  }

  override parse(input: string): string {
    if (input === 'CHANGE Module!') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for update wasm module');
  }
}
