import { serializeUInt } from '../../util/encoder';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../request_interface';
import { RequestMessage } from '../request_msg';
import { Instruction } from '../wasmito_vm/requests/instructions';

export class AddBreakpointRequest extends APIRequestNoSubscription<number> {
  readonly instruction = Instruction.Pause;

  private readonly instructionNr: string;
  readonly wasmAddr: number;

  constructor(wasmAddr: number) {
    super();
    this.wasmAddr = wasmAddr;
    this.instructionNr = '06';
  }

  description(): string {
    return 'AddBreakPointRequest';
  }

  getData(): string {
    const encodedAddr = serializeUInt(this.wasmAddr, 4, true);
    return `${this.instructionNr}${this.serializeID()}${encodedAddr}\n`;
  }

  parse(data: string): number {
    if (data === `BP ${this.wasmAddr}!`) {
      return this.wasmAddr;
    }
    throw new APIRequestInvalidParse('No ack for addbp');
  }
}

export class RemoveBreakpointRequest extends APIRequestNoSubscription<number> {
  readonly instruction = Instruction.Pause;

  private readonly instructionNr: string;
  private readonly wasmAddr: number;

  constructor(wasmAddr: number) {
    super();
    this.wasmAddr = wasmAddr;
    this.instructionNr = '07';
  }

  description(): string {
    return 'RemoveBreakPointRequest';
  }

  getData(): string {
    const encodedAddr = serializeUInt(this.wasmAddr, 4, true);
    return `${this.instructionNr}${this.serializeID()}${encodedAddr}\n`;
  }

  parse(data: string): number {
    if (data === `BP ${this.wasmAddr}!`) {
      return this.wasmAddr;
    }
    throw new APIRequestInvalidParse('No ack for rmvbp');
  }
}
