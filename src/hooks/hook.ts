import {
  type HookSchedule,
  ScheduleAways,
  ScheduleOnTimeStamp,
  ScheduleOnce,
} from './schedule';
import { type LogicalClock } from './logicalclock';

export enum HookKind {
  RemoteCall = '01',
  ValueSubstitution = '02',
  StateToInspect = '03',
  ChangeRunningState = '04',
  ProxyCall = '05',
}

export abstract class Hook<SubscriptionType> {
  public readonly kind: HookKind;
  public schedule: HookSchedule;
  constructor(kind: HookKind) {
    this.kind = kind;
    this.schedule = new ScheduleAways();
  }

  scheduleFor(newSchedule: HookSchedule): Hook<SubscriptionType> {
    this.schedule = newSchedule;
    return this;
  }

  scheduleOnce(logicalClock?: LogicalClock): Hook<SubscriptionType> {
    if (logicalClock !== undefined) {
      this.schedule = new ScheduleOnTimeStamp(logicalClock);
    } else {
      this.schedule = new ScheduleOnce();
    }
    return this;
  }

  abstract serializeBinary(): string;
  parseSubscriptionData?: (input: any) => SubscriptionType;
  onSubscriptionData?: (data: SubscriptionType) => void;
}

export abstract class HookWithoutSubscription extends Hook<void> {}
