export interface WARDuinoAPI {
  connect: (timeout?: number) => Promise<boolean>;
  disconnect: (timeout?: number) => Promise<boolean>;
  close: () => Promise<boolean>;
  run: (timeout?: number) => Promise<boolean>;
  step: (timeout?: number) => Promise<void>;
}
