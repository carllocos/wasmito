export enum Instruction {
  Run = '01',
  Halt = '02',
  Pause = '03',
  Step = '04',
  Inspect = '09',

  FuncCall = '41',

  UpdateWasmModule = '22',

  AroundFunction = '50',
  HookOnWasmAddr = '51',
  HookOnEvent = '52',

  LoadSnapshot = '62',

  Proxify = '65',
  PopEvent = '73',
  ProxyCall = '64',
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
      return Instruction.HookOnWasmAddr;
    case '64':
      return Instruction.ProxyCall;
    case '41':
      return Instruction.FuncCall;
    default:
      return undefined;
  }
}
