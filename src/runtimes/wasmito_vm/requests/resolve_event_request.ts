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

export class ResolveEventRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.PopEvent;

  description(): string {
    return 'ResolveEventRequest';
  }

  getData(): string {
    return `${Instruction.PopEvent}${this.serializeID()}\n`;
  }

  parse(input: string): boolean {
    if (input === `Interrupt: ${Instruction.PopEvent}`) {
      return true;
    }
    throw new APIRequestInvalidParse('No ack for Resolve Event');
  }

  processAck(ack: RequestMessage): boolean {
    if (isRequestMessage(ack, this.instruction)) {
      return ack.responseType === ResponseType.SuccessResponse;
    }

    throw new APIRequestInvalidParse('No ack for ResolveEvent');
  }
}
