export interface LogicalClock {
  nrOfInstructions: number;
  nrOfEvents: number;
}

export function logicalClockNrOfInstructions(t: LogicalClock): number {
  return t.nrOfInstructions;
}

export function logicalClockNrOfEvents(t: LogicalClock): number {
  return t.nrOfEvents;
}

export function newLogicalClock(
  nrOfIstr: number,
  nrOfevents: number,
): LogicalClock {
  return {
    nrOfInstructions: nrOfIstr,
    nrOfEvents: nrOfevents,
  };
}
