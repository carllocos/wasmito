import { StateBinaryEncoder } from '../../../webassembly/old_binary_state_serializer';
import { type WasmState } from '../../../webassembly/wasm';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';

export class LoadStateRequest extends APIRequestNoSubscription<string> {
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
    return this.encodedState;
  }

  parse(input: string): string {
    const expectedAck = this.lastRequest ? 'done!' : 'ack!';
    if (input === expectedAck) {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for StateUpdate request');
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
