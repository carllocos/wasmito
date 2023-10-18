export interface WARDuinoAPI {
  addBreakpoint: (wasmaddress: number) => Promise<boolean>;
  run: (timedout?: number) => Promise<boolean>;
}
