export interface Channel {
  open: () => Promise<void>
  close: () => Promise<void>
  send: (data: string) => Promise<void>
  addOnData: (callback: (data: string) => void) => void
  removeOnData: (callback: (data: string) => void) => void
}
