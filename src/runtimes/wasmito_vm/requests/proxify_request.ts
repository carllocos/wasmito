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

export class ProxifyRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.Proxify;

  getData(): string {
    return `${this.instruction}${this.serializeID()}\n`;
  }

  description(): string {
    return 'ProxifyRequest';
  }

  parse(input: string): string {
    if (input === 'Interrupt: 65') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Proxify');
  }
}
