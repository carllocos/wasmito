import {
  type HookSchedule,
  ScheduleAways,
  ScheduleOnTimeStamp,
  ScheduleOnce,
} from './schedule';
import { type LogicalClock } from './logicalclock';
import { createLogger } from '../logger/logger';
import type winston from 'winston';

export enum HookKind {
  RemoteCall = '01',
  ValueSubstitution = '02',
  StateToInspect = '03',
  ChangeRunningState = '04',
  ProxyCall = '05',

  // event hooks from 0x10 to 0x1f
  EventInspect = '10',
  EventRemove = '11',
}

export interface ISubscription<SubscriptionType> {
  readonly subscribe: (calllback: (value: SubscriptionType) => void) => void;
  readonly unSubscribe: (calllback: (value: SubscriptionType) => void) => void;
  readonly onSubscriptionData: (data: SubscriptionType) => void;
  readonly parseSubscriptionData: (input: any) => SubscriptionType;
  readonly clearSubscriptions: () => void;
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
  private listeners: Array<(data: SubscriptionType) => void>;
  private oneTimeListeners: Array<(data: SubscriptionType) => void>;
  private readonly removedListeners: Set<(data: SubscriptionType) => void>;
  protected logger: winston.Logger;

  constructor(kind: HookKind) {
    super(kind);
    this.listeners = [];
    this.oneTimeListeners = [];
    this.removedListeners = new Set();
    this.logger = createLogger('SubscriptionHook');
  }

  public subscribe(
    callback: (data: SubscriptionType) => void,
    oneTimeSubscription: boolean = false,
  ): void {
    let lstnrs: Array<(data: SubscriptionType) => void> = [];
    if (oneTimeSubscription) {
      lstnrs = this.oneTimeListeners;
    } else {
      lstnrs = this.listeners;
    }
    const found = lstnrs.find((cb) => cb === callback);
    if (found !== undefined) {
      this.logger.warn(`Attempting to add 2 same subscription callbacks`);
      return;
    }

    lstnrs.push(callback);
  }

  public unSubscribe(callback: (data: SubscriptionType) => void): void {
    this.removedListeners.add(callback);
  }

  onSubscriptionData(value: SubscriptionType): void {
    if (this.listeners.length === 0 && this.oneTimeListeners.length === 0) {
      return;
    }
    this.listeners.forEach((listener) => {
      if (!this.removedListeners.has(listener)) {
        listener(value);
      }
    });
    this.listeners = this.listeners.filter((cb) => {
      return !this.removedListeners.has(cb);
    });
    this.removedListeners.clear();
    this.oneTimeListeners.forEach((listener) => {
      listener(value);
    });
    this.oneTimeListeners = [];
  }

  clearSubscriptions(): void {
    this.removedListeners.clear();
    this.oneTimeListeners.length = 0;
    this.listeners.length = 0;
  }

  abstract parseSubscriptionData(input: any): SubscriptionType;
}
