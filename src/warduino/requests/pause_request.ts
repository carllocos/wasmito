import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';
import { Instruction } from '../api/instructions';

export class PauseRequest extends APIRequestNoSubscription<string> {
  description(): string {
    return 'PauseRequest';
  }

  getData(): string {
    return `${Instruction.Pause}\n`;
  }

  parse(input: string): string {
    if (input === 'PAUSE!') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Pause');
  }
}
