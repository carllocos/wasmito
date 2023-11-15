export interface WARDuinoAPI {
  run: (timedout?: number) => Promise<boolean>;
  step: (timedout?: number) => Promise<void>;
}
