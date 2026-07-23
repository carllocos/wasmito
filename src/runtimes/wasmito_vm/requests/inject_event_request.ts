import {
  encodeJSONToHexString,
  encodeStringToHex,
  encodeToHexLEB128,
} from '../../../util/encoder';
import { Instruction } from './instructions';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
  SubscriptionParseOutcome,
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
  override processAck(ack: RequestMessage): boolean {
    if (isRequestMessage(ack, this.instruction)) {
      return ack.responseType === ResponseType.SuccessResponse;
    }

    throw new APIRequestInvalidParse('no response for InjectEventRequest');
  }

  override async processSubscriptionData(
    _sub: RequestMessage,
  ): Promise<SubscriptionParseOutcome> {
    throw new Error(`lalal`);
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
