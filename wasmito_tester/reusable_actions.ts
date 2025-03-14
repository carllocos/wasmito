import { InspectStateHook } from '../src/hooks/hook_inspect_state';
import {
  type HookWithoutSubscription,
  type HookWithSubscription,
} from '../src/hooks/hook';
import { EventInspectHook } from '../src/hooks/hook_event';
import { EmptyValueSubstitution } from '../src/hooks/hook_value_substitution';
import { type WasmValuesBuilder } from '../src/webassembly';
import { type WASM, type WasmState } from '../src/webassembly/wasm';
import { type ProxyCallResponse } from '../src/warduino';
import { ResponseType } from '../src/warduino/api/request_interface';
import { AroundFunctionRequest } from '../src/warduino/requests/around_function_request';
import { PushEventRequest } from '../src/warduino/requests/inject_event_request';
import { StateRequest } from '../src/warduino/requests/inspect_request';
import { UpdateCallbackMappingRequest } from '../src/warduino/requests/update_callbacks_request';
import { type WARDuinoVM } from '../src/warduino/vm/warduino_vm';
import {
  type Action,
  type SubscriptionEmitterAction,
  type SubActReturn,
  type SubscribeAction,
} from './shared_interfaces';
import { Breakpoint } from '../src/debugger/breakpoint';
import { type WASMFunction } from '../src/webassembly/wasm/wasm_function';
import {
  sourceCodeLocationToString,
  type SourceCodeLocation,
} from '../src/source_mappers/source_map';

export function addBreakpointSubscription(
  subscriptionID: string,
  breakpoint: Breakpoint,
  timeout?: number,
): SubscriptionEmitterAction<boolean, WasmState, InspectStateHook> {
  const act: SubscriptionEmitterAction<boolean, WasmState, InspectStateHook> = {
    subscriptionID,
    timeout,
    description: `add breakpoint ${breakpoint.toString()}`,
    setupSubscription: async (
      device: WARDuinoVM,
    ): Promise<SubActReturn<boolean, WasmState, InspectStateHook>> => {
      const hook = new InspectStateHook(new StateRequest().includePC());
      breakpoint.subscribe(hook.onSubscriptionData.bind(hook));
      const added = await device.addBreakpoint(breakpoint);
      return [added, hook];
    },
    checkSetupSuccess: async (bpAdded: boolean): Promise<boolean> => {
      return bpAdded;
    },
    ifFail: `Failed to add bp ${breakpoint.toString()}`,
  };
  return act;
}

export function addBPAndRunUntil(
  loc: SourceCodeLocation,
  timeout: number,
): Action<boolean> {
  const act: Action<boolean> = {
    description: `add a bp ${sourceCodeLocationToString(loc)}, run until bp, and remove bp`,
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      return new Promise<boolean>((resolve, reject) => {
        const bp = new Breakpoint(loc);
        bp.subscribe((state: WasmState): void => {
          resolve(true);
        });

        device
          .addBreakpoint(bp)
          .then((bpAdded) => {
            if (!bpAdded) {
              resolve(false);
              return;
            }
            device
              .run()
              .then((running) => {
                if (!running) {
                  resolve(false);
                }
              })
              .catch(reject);
          })
          .catch(reject);
      });
    },
    checkActionSuccess: async (bpAdded: boolean): Promise<boolean> => {
      return bpAdded;
    },
    timeout,
    ifFail: `Failed to add and run until bp at ${sourceCodeLocationToString(loc)}`,
  };
  return act;
}

export function removeBPAt(
  loc: SourceCodeLocation,
  timeout: number,
): Action<boolean> {
  const act: Action<boolean> = {
    timeout,
    description: `remove breakpoint ${sourceCodeLocationToString(loc)}`,
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      const bp = new Breakpoint(loc);
      return await device.removeBreakpoint(bp);
    },
    checkActionSuccess: async (v: boolean): Promise<boolean> => {
      return v;
    },
    ifFail: `Failed to remove bp ${sourceCodeLocationToString(loc)}`,
  };
  return act;
}

export function onNewEventAction(
  subscriptionId: string,
  timeout: number,
): SubscriptionEmitterAction<boolean, WASM.Event, EventInspectHook> {
  const ac: SubscriptionEmitterAction<boolean, WASM.Event, EventInspectHook> = {
    subscriptionID: subscriptionId,
    description: 'Hook into new events',
    setupSubscription: async (
      device: WARDuinoVM,
    ): Promise<SubActReturn<boolean, WASM.Event, EventInspectHook>> => {
      const hook: HookWithSubscription<WASM.Event> = new EventInspectHook();
      const added = await device.addHookOnNewEvent(hook);
      return [added, hook];
    },

    checkSetupSuccess: async (hookAdded: boolean) => {
      return hookAdded;
    },
    ifFail: 'Failed to add hook upon event',
    timeout,
  };
  return ac;
}

export function onHandledEventSubscription(
  subscriptionId: string,
  timeout: number,
): SubscriptionEmitterAction<boolean, WASM.Event, EventInspectHook> {
  const ac: SubscriptionEmitterAction<boolean, WASM.Event, EventInspectHook> = {
    subscriptionID: subscriptionId,
    description: 'Hook into handled events',
    setupSubscription: async (
      device: WARDuinoVM,
    ): Promise<SubActReturn<boolean, WASM.Event, EventInspectHook>> => {
      const hook: HookWithSubscription<WASM.Event> = new EventInspectHook();
      const added = await device.addHookOnEventHandling(hook);
      return [added, hook];
    },

    checkSetupSuccess: async (hookAdded: boolean) => {
      return hookAdded;
    },
    ifFail: 'Failed to add hook on handled events',
    timeout,
  };
  return ac;
}

export function onHandledEventAction(
  hook: HookWithoutSubscription,
  timeout: number,
): Action<boolean> {
  const ac = {
    description: 'Apply Hook on handled event',
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      return await device.addHookOnEventHandling(hook);
    },

    checkActionSuccess: async (hookAdded: boolean) => {
      return hookAdded;
    },
    ifFail: 'Failed to add hook that applies on handled events',
    timeout,
  };
  return ac;
}

export function runVMAction(
  timeout?: number,
  delayTime?: number,
): Action<boolean> {
  const act: Action<boolean> = {
    description: 'Run VM',

    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      return device.run();
    },

    checkActionSuccess: async (running: boolean): Promise<boolean> => {
      return running;
    },
    ifFail: 'Failed to run device',
    timeout,
  };

  if (delayTime !== undefined) {
    act.delay = delayTime;
  }
  return act;
}

export function mockPrimitiveFuncAction(
  funcid: number,
  timeout: number,
): Action<boolean> {
  const act = {
    description: `mock primitive function ${funcid} with value substitution`,
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      const sm = device.sourceMap;
      const func = sm.getFunction(funcid);
      if (func === undefined) {
        return false;
      }
      const req = new AroundFunctionRequest(funcid).addHook(
        new EmptyValueSubstitution(),
      );
      const response = await device.sendRequest(req);
      return response.responseType === ResponseType.SuccessResponse;
    },
    checkActionSuccess: async (
      successfullResponse: boolean,
    ): Promise<boolean> => {
      return successfullResponse;
    },
    ifFail: `failed to mock primitive function ${funcid}`,
    timeout,
  };

  return act;
}

export function addEventAction(
  topic: string,
  payload: string,
  timeout?: number,
): Action<boolean> {
  const act = {
    description: `Add Event(topic=${topic}, payload=${payload}) to device`,
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      const req = new PushEventRequest(topic, payload);
      return await device.sendRequest(req);
    },
    checkActionSuccess: async (
      successfullResponse: boolean,
    ): Promise<boolean> => {
      return successfullResponse;
    },
    ifFail: `failed to add event to device`,
    timeout,
  };
  return act;
}

export function updateMappingsAction(
  mappings: WASM.CallbackMapping[],
  timeout: number,
): Action<boolean> {
  const act = {
    description: 'update callback mappings',
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      const req = new UpdateCallbackMappingRequest(mappings);
      return await device.sendRequest(req);
    },
    checkActionSuccess: async (
      successfullResponse: boolean,
    ): Promise<boolean> => {
      return successfullResponse;
    },
    ifFail: `failed to update callbacks mapping`,
    timeout,
  };

  return act;
}

export function stepAction(timeout: number): Action<boolean> {
  const act = {
    description: 'Step on VM',
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      await device.step(timeout);
      return true;
    },
    checkActionSuccess: async (
      successfullResponse: boolean,
    ): Promise<boolean> => {
      return successfullResponse;
    },
    ifFail: `failed to step in VM within the ${timeout} time`,
    timeout,
  };

  return act;
}

export function proxyCallAction(
  funcID: number,
  args: WasmValuesBuilder,
  timeout: number,
): Action<ProxyCallResponse> {
  const description = `ProxyCall function ${funcID} with args [${args.values
    .map((v) => v.value)
    .join(', ')}]`;
  const act = {
    description,
    doAction: async (device: WARDuinoVM): Promise<ProxyCallResponse> => {
      return await device.proxyCall(funcID, args.values);
    },
    checkActionSuccess: async (
      response: ProxyCallResponse,
    ): Promise<boolean> => {
      return response !== undefined;
    },
    ifFail: `ProxyCall failed within the ${timeout} time`,
    timeout,
  };

  return act;
}

export function registerFuncForProxyCallAction(
  funcID: number,
  timeout: number,
): Action<[boolean, WASMFunction, number, Set<WASMFunction>]> {
  const act = {
    description: `Register func ${funcID} for ProxyCall`,
    doAction: async (
      device: WARDuinoVM,
    ): Promise<[boolean, WASMFunction, number, Set<WASMFunction>]> => {
      const func = device.sourceMap.getFunction(funcID);
      if (func === undefined) {
        throw new Error(
          `Func with id ${funcID} is not part of the source code`,
        );
      }

      const setSizePriorAdd = device.functionsProxied().size;
      const added = await device.registerFuncForProxyCall(func, timeout);
      return [added, func, setSizePriorAdd, device.functionsProxied()];
    },
    checkActionSuccess: async ([added, func, oldSize, s]: [
      boolean,
      WASMFunction,
      number,
      Set<WASMFunction>,
    ]): Promise<boolean> => {
      return added && oldSize + 1 === s.size && s.has(func);
    },
    ifFail: ([added, func, oldSize, s]: [
      boolean,
      WASMFunction,
      number,
      Set<WASMFunction>,
    ]): string => {
      if (!added) {
        return `Failed to register func ${funcID} for ProxyCall`;
      } else if (oldSize + 1 !== s.size) {
        return `ProxyCall set should be size ${oldSize + 1} current size ${
          s.size
        }`;
      } else {
        const m = Array.from(s)
          .map((f: WASMFunction) => {
            return `'${f.name} (id=${f.id})'`;
          })
          .join(', ');
        return `Proxies Set does not contain proxied function '${func.name} (id=${func.id})' has instead ${m}`;
      }
    },
  };

  return act;
}

export function unregisterFuncForProxyCallAction(
  funcID: number,
  timeout: number,
): Action<[boolean, WASMFunction, number, Set<WASMFunction>]> {
  const act = {
    timeout,
    description: `Unregister func ${funcID} for ProxyCall`,
    doAction: async (
      device: WARDuinoVM,
    ): Promise<[boolean, WASMFunction, number, Set<WASMFunction>]> => {
      const func = device.sourceMap.getFunction(funcID);
      if (func === undefined) {
        throw new Error(
          `Func with id ${funcID} is not part of the source code`,
        );
      }
      const sizePriorRemove = device.functionsProxied().size;
      const removed = await device.unregisterFuncForProxyCall(func, timeout);
      return [removed, func, sizePriorRemove, device.functionsProxied()];
    },
    checkActionSuccess: async ([unregistered, func, sizePriorRemove, s]: [
      boolean,
      WASMFunction,
      number,
      Set<WASMFunction>,
    ]): Promise<boolean> => {
      return unregistered && sizePriorRemove - 1 === s.size && !s.has(func);
    },
    ifFail: ([removed, func, oldSize, s]: [
      boolean,
      WASMFunction,
      number,
      Set<WASMFunction>,
    ]): string => {
      if (!removed) {
        return `Failed to unregister func ${funcID} for ProxyCall`;
      } else if (oldSize - 1 !== s.size) {
        return `ProxyCall set should be size ${oldSize - 1} current size ${
          s.size
        }`;
      } else {
        const m = Array.from(s)
          .map((f: WASMFunction) => {
            return `'${f.name} (id=${f.id})'`;
          })
          .join(', ');
        return `Proxies Set should not contain proxied function '${func.name} (id=${func.id})' has instead ${m}`;
      }
    },
  };

  return act;
}

export function createOnErrorActionEmitter(
  subscriptionID: string,
  timeout: number,
): SubscriptionEmitterAction<boolean, WasmState, InspectStateHook> {
  const ac: SubscriptionEmitterAction<boolean, WasmState, InspectStateHook> = {
    subscriptionID,
    description: `Create on error emitter with id ${subscriptionID}`,
    setupSubscription: async (
      device: WARDuinoVM,
    ): Promise<SubActReturn<boolean, WasmState, InspectStateHook>> => {
      const req = new StateRequest();
      req.includeAll();
      const hook = new InspectStateHook(req);
      const added = await device.addHookOnError(hook);
      return [added, hook];
    },

    checkSetupSuccess: async (hookAdded: boolean) => {
      return hookAdded;
    },
    ifFail: 'Failed to add hook on error events',
    timeout,
  };
  return ac;
}

export function PauseAction(timeout?: number, delay?: number): Action<boolean> {
  return {
    description: 'Pause VM',
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      await device.pause(timeout);
      return true;
    },
    checkActionSuccess: async (
      successfullResponse: boolean,
    ): Promise<boolean> => {
      return successfullResponse;
    },
    ifFail: `failed to pause the VM`,
    timeout,
    delay,
  };
}

export function TriggerInterrupt(
  pin: number,
  timeout?: number,
  delay?: number,
): Action<boolean> {
  const a = addEventAction(`interrupt_${pin}`, '', timeout);
  a.delay = delay;
  return a;
}

export function SubscribeOnBPReached(
  id: string,
  timeout?: number,
  delay?: number,
): SubscribeAction<WasmState, InspectStateHook> {
  const description = `wait ${timeout === undefined ? '' : `max ${timeout}`} for '${id}'`;
  const act = {
    subscribeToID: id,
    description,
    checkSubscription: async (state: WasmState): Promise<boolean> => {
      return true;
    },
    ifFail: 'Failed to hit breakpoint',
    timeout,
    delay,
  };
  return act;
}
