import {
  encodeJSONToHexString,
  encodeStringToHex,
  encodeToHexLEB128,
} from '../../../util/encoder';
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

export class PushEventRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.PushEvent;
  private readonly topic: string;
  private readonly payload: string;
  private _binaryEncode: boolean;

  constructor(topic: string, payload: string) {
    super();
    this.topic = topic;
    this.payload = payload;
    this._binaryEncode = false;
  }

  description(): string {
    return `PushEventRequest Event(topic=${this.topic},payload=${this.payload})`;
  }

  binaryEncode(): void {
    this._binaryEncode = true;
  }

  getData(): string {
    const encoding = this._binaryEncode
      ? encodeEventAsBinary(this.topic, this.payload)
      : encodeEventAsJSON(this.topic, this.payload);
    return `${this.instruction}${this.serializeID()}${encoding}\n`;
  }

  private getDataBinaryEncoding(): string {
    return `${Instruction.PushEvent}${this.binaryEncodeTopic()}${this.binaryEncodePayload()}\n`;
  }

  binaryEncodeTopic(): string {
    // format: size topic (LEB) | topic hex
    const size = encodeToHexLEB128(this.topic.length);
    const t = encodeStringToHex(this.topic);
    return `${size}${t}`;
  }

  binaryEncodePayload(): string {
    // format: size payload (LEB) | payload hex
    const size = encodeToHexLEB128(this.payload.length);
    const p = encodeStringToHex(this.payload);
    return `${size}${p}`;
  }

  parse(input: string): boolean {
    if (input === 'new pushed event') {
      return true;
    }
    throw new APIRequestInvalidParse('no response for InjectEventRequest');
  }
}

export class MockPinInterruptRequest extends PushEventRequest {
  constructor(pin: number) {
    super(`interrupt_${pin}`, '');
  }
}

export function encodeEventAsJSON(topic: string, payload: string): string {
  const obj = { topic: topic, payload: payload };
  return encodeJSONToHexString(obj);
}

export function encodeEventAsBinary(topic: string, payload: string): string {
  return `${binaryEncodeTopic(topic)}${binaryEncodePayload(payload)}`;
}

function binaryEncodeTopic(topic: string): string {
  // format: size topic (LEB) | topic hex
  const size = encodeToHexLEB128(topic.length);
  const t = encodeStringToHex(topic);
  return `${size}${t}`;
}

function binaryEncodePayload(payload: string): string {
  // format: size payload (LEB) | payload hex
  const size = encodeToHexLEB128(payload.length);
  const p = encodeStringToHex(payload);
  return `${size}${p}`;
}
