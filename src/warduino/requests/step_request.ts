import {
  type APIRequest,
  APIRequestInvalidParse,
} from '../api/request_interface';
import { Instruction } from '../api/instructions';

export class StepRequest implements APIRequest<string> {
  getData(): string {
    return `${Instruction.Step}\n`;
  }

  parse(input: string): string {
    if (input === 'Step') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Step');
  }
}
