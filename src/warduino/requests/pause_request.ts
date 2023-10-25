import {
  type APIRequest,
  APIRequestInvalidParse,
} from '../api/request_interface';
import { Instruction } from '../api/instructions';

export class PauseRequest implements APIRequest<string> {
  getData(): string {
    return `${Instruction.Pause}\n`;
  }

  parse(input: string): string {
    if (input === 'Pause') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Pause');
  }
}
