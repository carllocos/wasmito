export type TimeStamp = [number, number]; // [nr of instructions, nr of events]

export function timeStampNrOfInstructions(t: TimeStamp): number {
  return t[0];
}

export function timeStampNrOfEvents(t: TimeStamp): number {
  return t[1];
}

export function newTimeStamp(nrOfIstr: number, nrOfevents: number): TimeStamp {
  return [nrOfIstr, nrOfevents];
}
