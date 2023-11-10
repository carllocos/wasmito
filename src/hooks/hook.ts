import {
  type HookSchedule,
  ScheduleAways,
  ScheduleOnTimeStamp,
  ScheduleOnce,
} from './schedule';
import { type TimeStamp } from './timestamp';

export enum HookKind {
  RemoteCall = '01',
  ValueSubstitution = '02',
  StateToInspect = '03',
  ChangeRunningState = '04',
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

  scheduleOnce(timestamp?: TimeStamp): Hook<SubscriptionType> {
    if (timestamp !== undefined) {
      this.schedule = new ScheduleOnTimeStamp(timestamp);
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
