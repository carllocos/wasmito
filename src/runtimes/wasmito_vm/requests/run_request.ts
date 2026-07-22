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

export class RunRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.Run;

  description(): string {
    return 'RunRequest';
  }

  getData(): string {
    return `${this.instruction}${this.serializeID()}\n`;
  }
  }

  parse(data: string): string {
    if (data === 'GO!') {
      return data;
    }
    throw new APIRequestInvalidParse('No ack for Run');
  }
}
