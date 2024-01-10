import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';
import { Instruction } from '../api/instructions';

export class StepRequest extends APIRequestNoSubscription<string> {
  description(): string {
    return 'StepRequest';
  }

  getData(): string {
    return `${Instruction.Step}\n`;
  }

  parse(input: string): string {
    if (input === 'STEP!') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Step');
  }
}
