import { Logger } from '../logger/logger';

export interface ISubscription<UnParsedSubData, SubscriptionType> {
  readonly subscribe: (
    callback:
      | ((value: SubscriptionType) => void)
      | ((value: SubscriptionType) => Promise<void>),
    oneTimeSubscription: boolean,
  ) => void;
  readonly unSubscribe: (
    callback:
      | ((value: SubscriptionType) => void)
      | ((value: SubscriptionType) => Promise<void>),
  ) => void;
  readonly onSubscriptionData: (data: SubscriptionType) => Promise<void>;
  readonly parseSubscriptionData: (input: UnParsedSubData) => SubscriptionType;
  readonly clearSubscriptions: () => void;
}

export abstract class ASubscription<UnParsedSubData, SubscriptionType>
  implements ISubscription<UnParsedSubData, SubscriptionType>
{
  private listeners: Array<
    | ((data: SubscriptionType) => void)
    | ((data: SubscriptionType) => Promise<void>)
  >;
  private oneTimeListeners: Array<
    | ((data: SubscriptionType) => void)
    | ((data: SubscriptionType) => Promise<void>)
  >;
  private readonly removedListeners: Set<
    | ((data: SubscriptionType) => void)
    | ((data: SubscriptionType) => Promise<void>)
  >;
  protected logger: Logger;

  constructor(logger: Logger) {
    this.listeners = [];
    this.oneTimeListeners = [];
    this.removedListeners = new Set();
    this.logger = logger;
  }

  public subscribe(
    callback:
      | ((data: SubscriptionType) => void)
      | ((data: SubscriptionType) => Promise<void>),
    oneTimeSubscription: boolean,
  ): void {
    if (oneTimeSubscription) this.oneTimeListeners.push(callback);
    else this.listeners.push(callback);
  }

  public unSubscribe(
    callback:
      | ((data: SubscriptionType) => void)
      | ((data: SubscriptionType) => Promise<void>),
  ): void {
    this.removedListeners.add(callback);
  }

  async onSubscriptionData(value: SubscriptionType): Promise<void> {
    if (this.listeners.length === 0 && this.oneTimeListeners.length === 0) {
      return;
    }
    for (const listener of this.listeners) {
      if (!this.removedListeners.has(listener)) {
        await listener(value);
      }
    }
    this.listeners = this.listeners.filter((cb) => {
      return !this.removedListeners.has(cb);
    });
    this.removedListeners.clear();
    for (const listener of this.oneTimeListeners) {
      await listener(value);
    }
    this.oneTimeListeners = [];
  }

  clearSubscriptions(): void {
    this.removedListeners.clear();
    this.oneTimeListeners.length = 0;
    this.listeners.length = 0;
  }
  abstract parseSubscriptionData(data: UnParsedSubData): SubscriptionType;
}

export class Subscription<UnParsedData, SubscriptionType> extends ASubscription<
  UnParsedData,
  SubscriptionType
> {
  private parse: (input: UnParsedData) => SubscriptionType;

  constructor(
    parseSubscriptionData: (input: any) => SubscriptionType,
    logger: Logger,
  ) {
    super(logger);
    this.parse = parseSubscriptionData;
  }

  override parseSubscriptionData(data: UnParsedData): SubscriptionType {
    return this.parse(data);
  }
}
