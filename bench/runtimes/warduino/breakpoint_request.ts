import { serializeUInt } from '../../../src/util/encoder';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../../src/runtimes/request_interface';
import { RequestMessage } from '../../../src/runtimes/request_msg';

export class AddBreakpointRequest extends APIRequestNoSubscription<number> {
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
    return `${this.instructionNr}${encodedAddr}\n`;
  }

  parse(data: string): number {
    if (data === `BP ${this.wasmAddr}!`) {
      return this.wasmAddr;
    }
    throw new APIRequestInvalidParse('No ack for addbp');
  }
}

export class RemoveBreakpointRequest extends APIRequestNoSubscription<number> {
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
    return `${this.instructionNr}${encodedAddr}\n`;
  }

  parse(data: string): number {
    if (data === `BP ${this.wasmAddr}!`) {
      return this.wasmAddr;
    }
    throw new APIRequestInvalidParse('No ack for rmvbp');
  }
}
