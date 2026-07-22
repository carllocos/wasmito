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

export class PauseRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.Pause;

  description(): string {
    return 'PauseRequest';
  }

  getData(): string {
    return `${this.instruction}${this.serializeID()}\n`;
  }

  processAck(ack: RequestMessage): boolean {
    if (isRequestMessage(ack, this.instruction)) {
      return ack.responseType == ResponseType.SuccessResponse;
    }
    throw new APIRequestInvalidParse('No ack for Pause');
  }

  parse(input: string): boolean {
    if (input === 'PAUSE!') {
      return true;
    }
    throw new APIRequestInvalidParse('No ack for Pause');
  }
}
