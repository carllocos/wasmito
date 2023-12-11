import {
  type LogicalClock,
  logicalClockNrOfEvents,
  logicalClockNrOfInstructions,
} from './logicalclock';
import { encodeToHexLEB128 } from '../util/encoder';

enum ScheduleKind {
  ScheduleOnce = '01', // hook run once and as soon as possible
  ScheduleAlways = '03', // hook runs everytime when needed
  ScheduleOnLogicalClock = '21', // hook executed on logical clock
  ScheduleBeforeLogicalClock = '22', // hook executed before logical clock
  ScheduleAfterLogicalClock = '23', // hook executed after logical clock
}

export abstract class HookSchedule {
  public readonly scheduleKind: ScheduleKind;
  constructor(scheduleKind: ScheduleKind) {
    this.scheduleKind = scheduleKind;
  }

  serializeBinary(): string {
    return `${this.scheduleKind}`;
  }
}

export class ScheduleOnce extends HookSchedule {
  constructor() {
    super(ScheduleKind.ScheduleOnce);
  }
}

export class ScheduleAways extends HookSchedule {
  constructor() {
    super(ScheduleKind.ScheduleAlways);
  }
}

export abstract class LogicalClockScheduling extends HookSchedule {
  public readonly logicalClock: LogicalClock;
  constructor(scheduleKind: ScheduleKind, timestamp: LogicalClock) {
    super(scheduleKind);
    this.logicalClock = timestamp;
  }

  serializeBinary(): string {
    // format expected: SCHEDULE_KIND (1 BYTE)
    // format logicalClock: nr of instructions (LEB32) | nr of events (LEB32);
    const nrOfInstr = logicalClockNrOfInstructions(this.logicalClock);
    const instrAsHex = encodeToHexLEB128(nrOfInstr);
    const nrOfEvents = logicalClockNrOfEvents(this.logicalClock);
    const evtsAsHex = encodeToHexLEB128(nrOfEvents);
    return `${this.scheduleKind}${instrAsHex}${evtsAsHex}`;
  }
}

export class ScheduleOnTimeStamp extends LogicalClockScheduling {
  constructor(logicalClock: LogicalClock) {
    super(ScheduleKind.ScheduleOnLogicalClock, logicalClock);
  }
}

export class ScheduleBeforeTimeStamp extends LogicalClockScheduling {
  constructor(logicalClock: LogicalClock) {
    super(ScheduleKind.ScheduleBeforeLogicalClock, logicalClock);
  }
}

export class ScheduleAfterTimeStamp extends LogicalClockScheduling {
  constructor(logicalClock: LogicalClock) {
    super(ScheduleKind.ScheduleAfterLogicalClock, logicalClock);
  }
}
