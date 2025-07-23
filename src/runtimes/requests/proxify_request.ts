import { Instruction } from '../api/instructions';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';

export class ProxifyRequest extends APIRequestNoSubscription<string> {
  getData(): string {
    return `${Instruction.Proxify}\n`;
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
