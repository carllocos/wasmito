import {
  type HookSchedule,
  ScheduleAways,
  ScheduleOnTimeStamp,
  ScheduleOnce,
  ScheduleBeforeTimeStamp,
  ScheduleAfterTimeStamp,
} from './schedule';
import { type LogicalClock } from './logicalclock';
import { createLogger, Logger } from '../logger/logger';
import { ISubscription, Subscription } from './isubscribe';

export enum HookKind {
  RemoteCall = '01',
  ValueSubstitution = '02',
  StateToInspect = '03',
  ChangeRunningState = '04',
  ProxyCall = '05',

  // event hooks from 0x10 to 0x1f
  EventInspect = '10',
  EventRemove = '11',
  EventAdd = '12',
}

export type SubscriptionHook<SubscriptionType> =
  ISubscription<SubscriptionType>;

export abstract class Hook {
  public readonly kind: HookKind;
  public schedule: HookSchedule;
  constructor(kind: HookKind) {
    this.kind = kind;
    this.schedule = new ScheduleAways();
  }

  scheduleFor(newSchedule: HookSchedule): Hook {
    this.schedule = newSchedule;
    return this;
  }

  scheduleBefore(logicalClock: LogicalClock): Hook {
    this.schedule = new ScheduleBeforeTimeStamp(logicalClock);
    return this;
  }

  scheduleAfter(logicalClock: LogicalClock): Hook {
    this.schedule = new ScheduleAfterTimeStamp(logicalClock);
    return this;
  }

  scheduleOn(logicalClock: LogicalClock): Hook {
    this.schedule = new ScheduleOnTimeStamp(logicalClock);
    return this;
  }

  scheduleOnce(logicalClock?: LogicalClock): Hook {
    if (logicalClock !== undefined) {
      this.schedule = new ScheduleOnTimeStamp(logicalClock);
    } else {
      this.schedule = new ScheduleOnce();
    }
    return this;
  }

  abstract description(): string;
  abstract serializeBinary(): string;
}

export abstract class HookWithoutSubscription extends Hook {}

export abstract class HookWithSubscription<SubscriptionType>
  extends Hook
  implements SubscriptionHook<SubscriptionType>
{
  private subscriptions: Subscription<SubscriptionType>;
  protected logger: Logger;

  constructor(kind: HookKind, logger?: Logger) {
    super(kind);
    this.logger = logger ?? createLogger('SubscriptionHook');
    this.subscriptions = new Subscription(
      this.parseSubscriptionData.bind(this),
      this.logger,
    );
  }

  public subscribe(
    callback: (data: SubscriptionType) => void,
    oneTimeSubscription: boolean = false,
  ): void {
    this.subscriptions.subscribe(callback, oneTimeSubscription);
  }

  public unSubscribe(callback: (data: SubscriptionType) => void): void {
    this.subscriptions.unSubscribe(callback);
  }

  onSubscriptionData(value: SubscriptionType): void {
    this.subscriptions.onSubscriptionData(value);
  }

  clearSubscriptions(): void {
    this.subscriptions.clearSubscriptions();
  }

  abstract parseSubscriptionData(input: any): SubscriptionType;
}

export function isHookWithSubscription<SubscriptionType>(
  h: Hook,
): h is HookWithSubscription<SubscriptionType> {
  return h instanceof HookWithSubscription;
}
