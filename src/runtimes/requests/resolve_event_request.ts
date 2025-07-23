import { Instruction } from '../api/instructions';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../api/request_interface';

export class ResolveEventRequest extends APIRequestNoSubscription<void> {
  description(): string {
    return 'ResolveEventRequest';
  }

  getData(): string {
    return `${Instruction.PopEvent}\n`;
  }

  parse(input: string): string {
    if (input === `Interrupt: ${Instruction.PopEvent}`) {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Resolve Event');
  }
}
