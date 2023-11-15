export interface WARDuinoAPI {
  run: (timeout?: number) => Promise<boolean>;
  step: (timeout?: number) => Promise<void>;
}
