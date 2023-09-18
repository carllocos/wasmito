export class APIRequestInvalidParse extends Error {}

export interface APIRequest<R> {
  getData: () => string
  parse: (input: string) => R
}

export enum Instruction {
  Run = '01',
  Halt = '02',
  Pause = '03',
  Step = '04',
  Inspect = '09',
  StartRecording = '50',
  StopRecording = '51',
}
