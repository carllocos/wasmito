import { WASM } from '../webassembly/wasm';
import { isHexaString } from '../util/decoder';
import { APIRequestInvalidParse } from '../runtimes/request_interface';
import {
  HookKind,
  HookWithSubscription,
  HookWithoutSubscription,
} from './hook';
import { encodeEventAsBinary } from '../runtimes/wasmito_vm/requests/inject_event_request';

export class EventRemoveHook extends HookWithoutSubscription {
  constructor() {
    super(HookKind.EventRemove);
  }

  serializeBinary(): string {
    // format: HookKind (1 BYTE)
    return `${this.kind}`;
  }

  description(): string {
    return 'EventRemove';
  }
}

export class EventInspectHook extends HookWithSubscription<WASM.Event> {
  constructor() {
    super(HookKind.EventInspect);
    // this.parseSubscriptionData = this.deserializeSubscriptionMessage.bind(this);
  }

  serializeBinary(): string {
    // format: HookKind (1 BYTE)
    return `${this.kind}`;
  }

  description(): string {
    return 'EventInspect';
  }

  parseSubscriptionData(data: any): WASM.Event {
    if (typeof data !== 'string') {
      throw new APIRequestInvalidParse(
        'no subscription reply for EventInspectHook',
      );
    }

    if (!isHexaString(data)) {
      throw new APIRequestInvalidParse(
        'no subscription reply for EventInspectHook',
      );
    }

    const ev = WASM.decodeEventFromHexaStr(data);
    if (ev === undefined) {
      throw new APIRequestInvalidParse(
        'no subscription reply for EventInspectHook',
      );
    }
    return ev;
  }
}

export class AddEventHook extends HookWithoutSubscription {
  readonly topic: string;
  readonly payload: string;
  constructor(topic: string, payload: string) {
    super(HookKind.EventAdd);
    this.topic = topic;
    this.payload = payload;
  }

  serializeBinary(): string {
    return `${this.kind}${encodeEventAsBinary(this.topic, this.payload)}`;
  }

  description(): string {
    return `AddEventAction Event(topic=${this.topic},payload=${this.payload})`;
  }
}

export class AddEventPinHook extends AddEventHook {
  readonly pin: number;
  constructor(pin: number) {
    super(`interrupt_${pin}`, '');
    this.pin = pin;
  }

  description(): string {
    return `AddEventPinAction Event(topic=${this.topic},payload=${this.payload})`;
  }
}
