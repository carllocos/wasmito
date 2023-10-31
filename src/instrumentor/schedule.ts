import {
  type TimeStamp,
  timeStampNrOfEvents,
  timeStampNrOfInstructions,
} from './timestamp';
import { encodeLEB128ToHex } from '../util/encoder';

enum ScheduleKind {
  ScheduleOnce = '01', // hook run once and as soon as possible
  ScheduleAlways = '03', // hook runs everytime when needed
  ScheduleOnTimeStamp = '21', // hook executed on timestamp
  ScheduleBeforeTimeStamp = '22', // hook executed before timestamp
  ScheduleAfterTimeStamp = '23', // hook executed after timestamp
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

export abstract class TimeStampScheduling extends HookSchedule {
  public readonly timestamp: TimeStamp;
  constructor(scheduleKind: ScheduleKind, timestamp: TimeStamp) {
    super(scheduleKind);
    this.timestamp = timestamp;
  }

  serializeBinary(): string {
    // format expected: SCHEDULE_KIND (1 BYTE)
    // format timestamp: nr of instructions (LEB32) | nr of events (LEB32);
    const nrOfInstr = timeStampNrOfInstructions(this.timestamp);
    const instrAsHex = encodeLEB128ToHex(nrOfInstr);
    const nrOfEvents = timeStampNrOfEvents(this.timestamp);
    const evtsAsHex = encodeLEB128ToHex(nrOfEvents);
    return `${this.scheduleKind}${instrAsHex}${evtsAsHex}`;
  }
}

export class ScheduleOnTimeStamp extends TimeStampScheduling {
  constructor(timestamp: TimeStamp) {
    super(ScheduleKind.ScheduleOnTimeStamp, timestamp);
  }
}

export class ScheduleBeforeTimeStamp extends TimeStampScheduling {
  constructor(timestamp: TimeStamp) {
    super(ScheduleKind.ScheduleBeforeTimeStamp, timestamp);
  }
}

export class ScheduleAfterTimeStamp extends TimeStampScheduling {
  constructor(timestamp: TimeStamp) {
    super(ScheduleKind.ScheduleAfterTimeStamp, timestamp);
  }
}
