/*
 * Schedule of a hook. A hook either runs every time its target is reached
 * (the default) or only once, after which the VM removes it.
 *
 */
enum ScheduleKind {
  ScheduleOnce = '01', // hook run once and as soon as possible
  ScheduleAlways = '03', // hook runs everytime when needed
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
