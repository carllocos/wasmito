import { assertFatalHookError } from '../../hooks/hook';
import { EventInspectHook } from '../../hooks/hook_event';
import { InspectStateHook } from '../../hooks/hook_inspect_state';
import { PauseVMHook } from '../../hooks/hook_run_pause';
import { getGlobalLogger } from '../../logger/logger';
import { WasmitoBackendVM } from '../../runtimes/wasmito_vm/wasmito_vm';
import { WASM } from '../../webassembly/wasm';
import { ReadOnlyInterrupt, WritableInterrupt } from '../interrupts';
import { GroupHooks, InstrMoment } from '../group_hooks';

export function interrupt(
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  moment:
    | 'onNewInterrupt'
    | 'beforeInterruptHandled'
    | 'afterHandlingInterrupt',
  mutate: boolean,
  writableInterrupt: boolean,
  cb: (...args: any[]) => any,
): GroupHooks {
  switch (cb.length) {
    case 0:
      return createNewInterruptCallbackNoArgs(moment, mutate, cb);
    case 1:
    case 2:
      return createNewInterruptCallbackArgs(
        moment,
        vm,
        maxTimeoutMs,
        mutate,
        writableInterrupt,
        cb,
      );
    default:
      throw new Error(`provided invalid callback`);
  }
}

function createNewInterruptCallbackNoArgs(
  interruptMoment: InstrMoment,
  updateState: boolean,
  cb: () => void,
): GroupHooks {
  const g = new GroupHooks(interruptMoment);
  if (updateState) {
    g.addInterruptAction(new PauseVMHook());
  }
  const si = new InspectStateHook().includePC();
  si.subscribe((_s) => {
    cb();
  });
  g.addInterruptAction(si);
  return g;
}

function createNewInterruptCallbackArgs(
  moment: InstrMoment,
  vm: WasmitoBackendVM,
  maxTimeoutMs: number,
  mutate: boolean,
  writableInterrupt: boolean,
  cb: (...args: any[]) => any,
): GroupHooks {
  const g = new GroupHooks(moment);
  if (mutate) {
    g.addInterruptAction(new PauseVMHook());
  }
  const si = new EventInspectHook();
  si.subscribe((e: WASM.Event) => {
    const ev = writableInterrupt
      ? new WritableInterrupt(e)
      : new ReadOnlyInterrupt(e);
    const newEvent = cb(ev, vm);
    if (mutate) {
      assertFatalHookError(
        newEvent instanceof WritableInterrupt,
        'onNewInterrupt should return a writable Event',
      );
      getGlobalLogger().error(`TODO update event`);
      vm.run(maxTimeoutMs);
    }
  });
  g.addInterruptAction(si);
  return g;
}
