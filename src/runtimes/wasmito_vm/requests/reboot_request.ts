import {
  APIRequestInvalidParse,
  APIRequestNoSubscription,
} from '../../request_interface';
import { RequestMessage, ResponseType } from '../../request_msg';

export class RebootRequest extends APIRequestNoSubscription<void> {
  description(): string {
    return 'RebootRequest';
  }

  getData(): string {
    throw new Error('TODO');
  }

  parse(input: string): void {
    if (input === 'Reboot!') {
      return;
    }
    throw new APIRequestInvalidParse('No ack for Reboot');
  }
}
