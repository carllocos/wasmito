import { StateBinaryEncoder } from '../../../webassembly/old_binary_state_serializer';
import { type WasmState } from '../../../webassembly/wasm';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import {
  isRequestMessage,
  RequestMessage,
  ResponseType,
} from '../../request_msg';
import { Instruction } from './instructions';

export class LoadStateRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.LoadSnapshot;

  private readonly encodedState: string;
  private readonly lastRequest: boolean;

  constructor(encodeState: string, lastRequest: boolean) {
    super();
    this.encodedState = encodeState;
    this.lastRequest = lastRequest;
  }

  description(): string {
    return 'LoadStateRequest';
  }

  getData(): string {
    return `${this.instruction}${this.serializeID()}${this.encodedState}`;
  }

  parse(input: string): boolean {
    const expectedAck = this.lastRequest ? 'done!' : 'ack!';
    if (input === expectedAck) {
      return true;
    }
    throw new APIRequestInvalidParse('No ack for StateUpdate request');
  }

  processAck(ack: RequestMessage): boolean {
    if (isRequestMessage(ack, this.instruction)) {
      if (ack.responseType !== ResponseType.SuccessResponse) return false;

      const expectedAck = this.lastRequest ? 'done!' : 'ack!';
      return ack.sub === expectedAck;
    }
    throw new Error('No ack for StateUpdate request');
  }
}

export class LoadStateRequestBuilder {
  private readonly encoder: StateBinaryEncoder;

  constructor(wasmState: WasmState) {
    this.encoder = new StateBinaryEncoder(wasmState);
  }

  buildRequests(): LoadStateRequest[] {
    const binaryHexs = this.encoder.toBinary();
    return binaryHexs.map((encodedState, idx) => {
      const lastRequest = idx + 1 >= binaryHexs.length;
      return new LoadStateRequest(encodedState, lastRequest);
    });
  }
}
