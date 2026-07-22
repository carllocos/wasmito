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

export class PauseRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.Pause;

  description(): string {
    return 'PauseRequest';
  }

  getData(): string {
    return `${this.instruction}${this.serializeID()}\n`;
  }
  }

  parse(input: string): string {
    if (input === 'PAUSE!') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Pause');
  }
}
