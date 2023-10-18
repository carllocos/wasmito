import {
  type APIRequest,
  APIRequestInvalidParse,
  Instruction,
} from './request_interface';

export class StepRequest implements APIRequest<string> {
  getData(): string {
    return `${Instruction.Step}\n`;
  }

  parse(input: string): string {
    if (input === 'Step') {
      return input;
    }
    throw new APIRequestInvalidParse('No ack for Step');
  }
}
