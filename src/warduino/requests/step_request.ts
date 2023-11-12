import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';
import { Instruction } from '../api/instructions';

export class StepRequest extends APIRequestNoSubscription<string> {
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
