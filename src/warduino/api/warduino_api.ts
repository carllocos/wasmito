export interface WARDuinoAPI {
  addBreakpoint: (wasmaddress: number) => Promise<boolean>;
  run: (timedout?: number) => Promise<boolean>;
  step: (timedout?: number) => Promise<void>;
}
