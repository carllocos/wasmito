import { Instruction } from './instructions';
import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import {
  isRequestMessage,
  RequestMessage,
  ResponseType,
} from '../../request_msg';

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
