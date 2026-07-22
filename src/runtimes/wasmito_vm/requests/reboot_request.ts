import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import { RequestMessage, ResponseType } from '../../request_msg';
import { Instruction } from './instructions';

export class RebootRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.Run; // TODO no reboot request yet

  description(): string {
    return 'RebootRequest';
  }

  getData(): string {
    throw new Error('TODO');
  }

  parse(input: string): boolean {
    if (input === 'Reboot!') {
      return true;
    }
    throw new APIRequestInvalidParse('No ack for Reboot');
  }

  processAck(ack: RequestMessage): boolean {
    if (ack.interrupt === this.instruction) {
      return ack.responseType === ResponseType.SuccessResponse;
    }

    throw new APIRequestInvalidParse('No ack for Reboot');
  }
}
