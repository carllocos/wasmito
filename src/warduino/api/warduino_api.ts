export interface WARDuinoAPI {
  connect: (timeout?: number) => Promise<boolean>;
  disconnect: (timeout?: number) => Promise<boolean>;
  close: () => Promise<boolean>;
  run: (timeout?: number) => Promise<boolean>;
  pause: (timeout?: number) => Promise<void>;
  step: (timeout?: number) => Promise<void>;
  proxify: (timeout?: number) => Promise<void>;
  uploadSourceCode: (
    sourceCodePath: string,
    timeout?: number,
  ) => Promise<boolean>;
}
