export interface Channel {
  open: (timeout?: number) => Promise<boolean>;
  close: () => Promise<boolean>;
  send: (data: string) => Promise<boolean>;
  addOnData: (callback: (data: string) => void) => void;
  removeOnData: (callback: (data: string) => void) => void;
}
