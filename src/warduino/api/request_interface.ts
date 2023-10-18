export class APIRequestInvalidParse extends Error {}

export interface APIRequest<R> {
  getData: () => string;
  parse: (input: string) => R;
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

export function getInstructionFromString(str: string): Instruction | undefined {
  switch (str) {
    case '01':
      return Instruction.Run;
    case '02':
      return Instruction.Halt;
    case '03':
      return Instruction.Pause;
    case '04':
      return Instruction.Step;
    case '09':
      return Instruction.Inspect;
    case '50':
      return Instruction.AroundFunction;
    case '51':
      return Instruction.StopRecording;
    default:
      return undefined;
  }
}
