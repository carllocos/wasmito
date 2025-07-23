import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';
import { Instruction } from '../api/instructions';

export class RunRequest extends APIRequestNoSubscription<string> {
  description(): string {
    return 'RunRequest';
  }

  getData(): string {
    return `${Instruction.Run}\n`;
  }

  parse(data: string): string {
    if (data === 'GO!') {
      return data;
    }
    throw new APIRequestInvalidParse('No ack for Run');
  }
}
