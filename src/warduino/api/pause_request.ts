import {
  type APIRequest,
  APIRequestInvalidParse,
  Instruction
} from './request_interface'

export class PauseRequest implements APIRequest<string> {
  getData (): string {
    return `${Instruction.Pause}`
  }

  parse (input: string): string {
    if (input === 'Pause') {
      return input
    }
    throw new APIRequestInvalidParse('No ack for Pause')
  }
}
