export interface RuntimeDebugAPI {
  runtimeName: string;

  addBreakpoint: (addr: number, timeout?: number) => Promise<boolean>;

  removeBreakpoint: (addr: number, timeout?: number) => Promise<boolean>;

  onBreakpoint: (handler: (bpAdrr: number) => void) => void;

  removeOnBreakpoint: (handler: (bpAdrr: number) => void) => void;

  run: (timeout?: number) => Promise<boolean>;

  inspectPC: (timeout?: number) => Promise<number>;

  step: (timeout?: number) => Promise<boolean>;

  startRuntime: (timeout: number) => Promise<boolean>;

  stopRuntime: (timeout: number) => Promise<boolean>;
}
