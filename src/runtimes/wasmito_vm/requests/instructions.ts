export enum Instruction {
  Run = '01',
  Halt = '02',
  Pause = '03',
  Step = '04',
  Inspect = '09',

  FuncCall = '41',

  UpdateWasmModule = '22',
  updateStackValue = '24',

  AroundFunction = '50',
  HookOnWasmAddr = '51',
  HookOnEvent = '52',
  HookOnError = '53',

  LoadSnapshot = '62',

  Proxify = '65',
  ProxyCall = '64',

  PopEvent = '72',
  PushEvent = '73',

  UpdateCallbackmapping = '75',
}

export function getInstructionFromString(str: string): Instruction | undefined {
  const enumValues: string[] = Object.values(Instruction);
  if (enumValues.includes(str)) {
    return str as Instruction;
  }
  return undefined;
}
