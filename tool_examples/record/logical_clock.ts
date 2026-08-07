export interface LogicalClock {
  instrs: number;
  interrupts: number;
}

export function copyClock(c: LogicalClock): LogicalClock {
  return {
    instrs: c.instrs,
    interrupts: c.interrupts,
  };
}

export function newLogicalClock(): LogicalClock {
  return {
    instrs: 0,
    interrupts: 0,
  };
}

export function equalLogicalClocks(
  c1: LogicalClock,
  c2: LogicalClock,
): boolean {
  return c1.instrs === c2.instrs && c1.interrupts === c2.interrupts;
}
