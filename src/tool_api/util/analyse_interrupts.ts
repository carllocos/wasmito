import { assertFatalHookError, SubscriptionContent } from '../../hooks/hook';
import { getGlobalLogger } from '../../logger/logger';
import { WasmitoBackendVM } from '../../runtimes/wasmito_vm/wasmito_vm';
import { WASM } from '../../webassembly/wasm';
import { ReadOnlyInterrupt, WritableInterrupt } from '../interrupts';
import {
  HookOnEventContent,
  HookOnEventMoment,
} from '../../runtimes/wasmito_vm/requests/hook_on_event_request';
import { AdvicesRegistery } from './advices_registery';

function convertEvent(
  writable: boolean,
  ev: ReadOnlyInterrupt | WritableInterrupt,
): ReadOnlyInterrupt | WritableInterrupt {
  return writable
    ? new WritableInterrupt(ev.topic, ev.payload)
    : new ReadOnlyInterrupt(ev.topic, ev.payload);
}

export function runAdvicesInterrupt(
  advicesContainer: AdvicesRegistery,
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
): (data: SubscriptionContent<HookOnEventContent, WASM.Event>) => void {
  return async (sub: SubscriptionContent<HookOnEventContent, WASM.Event>) => {
    const moment = sub.metadata.moment;
    const advices = advicesContainer.getInterruptAdvices(moment);
    let ev: ReadOnlyInterrupt | WritableInterrupt = new ReadOnlyInterrupt(
      sub.sub,
    );
    let mutated = false;
    for (const [advice, mutate] of advices) {
      mutated = mutated || mutate;
      ev = convertEvent(mutate, ev);
      const ad = advice as any; // TODO fix
      const newEvent = await ad(ev, vm);
      assertUpdateEvent(newEvent, mutate);
    }

    if (mutated) {
      getGlobalLogger().warn(`TODO update event`);
      await vm.run(maxTimeoutMs);
    }
  };
}

function assertUpdateEvent(
  ev: WritableInterrupt | ReadOnlyInterrupt | undefined,
  expectedUpdate: boolean,
) {
  if (expectedUpdate) {
    assertFatalHookError(
      ev instanceof WritableInterrupt,
      `Expected Wasm.Event to be of type WritableInterrupt`,
    );
    return;
  }
  assertFatalHookError(
    ev === undefined,
    'A non mutable advice should return nothing',
  );
}

function convertToHookEventMoment(m: string): HookOnEventMoment {
  switch (m) {
    case 'onNewInterrupt':
      return HookOnEventMoment.onNewEvent;
    case 'beforeInterruptHandled':
      return HookOnEventMoment.beforeEventHandled;
    case 'afterHandlingInterrupt':
      return HookOnEventMoment.afterEventHandled;
    default:
      throw new Error(`Unsupported on interrupt advice ${m}`);
  }
}

export function interrupt(
  advices: AdvicesRegistery,
  moment:
    | 'onNewInterrupt'
    | 'beforeInterruptHandled'
    | 'afterHandlingInterrupt',
  mutate: boolean,
  cb: (...args: any[]) => any,
  _maxTimeoutMs: number, // TODO use
): number {
  const m = convertToHookEventMoment(moment);
  return advices.addInterruptAdvice(m, mutate, cb);
}
