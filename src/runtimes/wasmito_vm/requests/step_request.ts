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

  parse(input: string): boolean {
    if (input === 'STEP!') {
      return true;
    }
    throw new APIRequestInvalidParse('No ack for Step');
  }

  processAck(ack: RequestMessage): boolean {
    if (isRequestMessage(ack, this.instruction)) {
      return ack.responseType === ResponseType.SuccessResponse;
    }

    throw new APIRequestInvalidParse('No ack for Step');
  }
}
