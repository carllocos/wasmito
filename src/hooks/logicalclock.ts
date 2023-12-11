export type LogicalClock = [number, number]; // [nr of instructions, nr of events]

export function logicalClockNrOfInstructions(t: LogicalClock): number {
  return t[0];
}

export function logicalClockNrOfEvents(t: LogicalClock): number {
  return t[1];
}

export function newLogicalClock(
  nrOfIstr: number,
  nrOfevents: number,
): LogicalClock {
  return [nrOfIstr, nrOfevents];
}
