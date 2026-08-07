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

export class RunRequest extends APIRequestNoSubscription<boolean> {
  readonly instruction = Instruction.Run;

  description(): string {
    return 'RunRequest';
  }

  getData(): string {
    return `${this.instruction}${this.serializeID()}\n`;
  }

  override processAck(ack: RequestMessage): boolean {
    if (isRequestMessage(ack, this.instruction))
      return ack.responseType === ResponseType.SuccessResponse;

    throw new APIRequestInvalidParse('No ack for Run');
  }

  parse(data: string): boolean {
    if (data === 'GO!') {
      return true;
    }
    throw new APIRequestInvalidParse('No ack for Run');
  }
}
