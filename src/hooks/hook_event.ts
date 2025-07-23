import { WASM } from '../webassembly/wasm';
import { isHexaString } from '../util/decoder';
import { APIRequestInvalidParse } from '../runtimes/api/request_interface';
import {
  HookKind,
  HookWithSubscription,
  HookWithoutSubscription,
} from './hook';

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
