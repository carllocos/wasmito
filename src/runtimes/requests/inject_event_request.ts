import { encodeJSONToHexString } from '../../util/encoder';
import { Instruction } from '../api/instructions';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';

export class PushEventRequest extends APIRequestNoSubscription<boolean> {
  private readonly topic: string;
  private readonly payload: string;

  constructor(topic: string, payload: string) {
    super();
    this.topic = topic;
    this.payload = payload;
  }

  description(): string {
    return `PushEventRequest Event(topic=${this.topic},payload=${this.payload})`;
  }

  getData(): string {
    const obj = { topic: this.topic, payload: this.payload };
    const hexEvent = encodeJSONToHexString(obj);
    return `${Instruction.PushEvent}${hexEvent}\n`;
  }

  parse(input: string): boolean {
    if (input === 'new pushed event') {
      return true;
    }
    throw new APIRequestInvalidParse('no response for InjectEventRequest');
  }
}
