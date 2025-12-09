export interface Channel {
  readonly channelName: string;
  open: (timeout?: number) => Promise<boolean>;
  close: (timeout?: number) => Promise<boolean>;
  write: (
    data: any,
    cb?: ((err?: Error | null | undefined) => void) | undefined,
  ) => boolean;
  send: (data: string) => Promise<boolean>;
  addOnData: (callback: (data: string) => void) => void;
  removeOnData: (callback: (data: string) => void) => void;
  addOnWriteListener: (callback: (data: string | Uint8Array) => void) => void;
  removeOnWriteListener: (
    callback: (data: string | Uint8Array) => void,
  ) => void;
}
