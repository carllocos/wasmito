export interface WARDuinoAPI {
  addBreakpoint: (wasmaddress: number) => Promise<boolean>;
  run: () => Promise<boolean>;
}
