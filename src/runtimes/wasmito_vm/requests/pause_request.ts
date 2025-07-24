import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import { Instruction } from './instructions';

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
