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

export class StepRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.Step;

  description(): string {
    return 'StepRequest';
  }

  getData(): string {
    return `${this.instruction}${this.serializeID()}\n`;
  }

  parse(input: string): string {
    if (input === 'STEP!') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Step');
  }
}
