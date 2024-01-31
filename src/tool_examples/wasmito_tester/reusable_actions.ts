import { type HookWithSubscription } from '../../hooks/hook';
import { EventInspectHook } from '../../hooks/hook_event';
import { EmptyValueSubstitution } from '../../hooks/hook_value_substitution';
import { type WasmValuesBuilder } from '../../state';
import { type WASM, type WasmState } from '../../state/wasm';
import { type ProxyCallResponse } from '../../warduino';
import { ResponseType } from '../../warduino/api/request_interface';
import { AroundFunctionRequest } from '../../warduino/requests/around_function_request';
import { PushEventRequest } from '../../warduino/requests/inject_event_request';
import { StateRequest } from '../../warduino/requests/inspect_request';
import { UpdateCallbackMappingRequest } from '../../warduino/requests/update_callbacks_request';
import { type WARDuinoVM } from '../../warduino/vm/warduino_vm';
import {
  type Action,
  type SubscriptionAction,
  type SubActReturn,
} from './shared_interfaces';

export function addBPAndRunUntil(
  linenr: number,
  timeout: number,
): Action<boolean> {
  const act: Action<boolean> = {
    description: `add a bp at linenr ${linenr}, run until bp, and remove bp`,
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      return new Promise<boolean>((resolve, reject) => {
        const onBpReached = (state: WasmState): void => {
          resolve(true);
        };
        device
          .addBreakpoint(
            {
              linenr,
            },
            new StateRequest().includePC(),
            onBpReached,
          )
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
    ifFail: {
      timeout,
      message: `Failed to add and run until bp at line ${linenr}`,
    },
  };
  return act;
}

export function removeBPAt(linenr: number, timeout: number): Action<boolean> {
  const act: Action<boolean> = {
    description: `remove breakpoint at line ${linenr}`,
    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      return await device.removeBreakpoint({
        linenr,
      });
    },
    checkActionSuccess: async (v: boolean): Promise<boolean> => {
      return v;
    },
    ifFail: {
      timeout,
      message: `Failed to remove bp at line ${linenr}`,
    },
  };
  return act;
}

export function onNewEventAction(
  subscriptionId: string,
  timeout: number,
): SubscriptionAction<boolean, WASM.Event, EventInspectHook> {
  const ac = {
    subscriptionID: subscriptionId,
    description: 'Hook into new events',
    doAction: async (
      device: WARDuinoVM,
    ): Promise<SubActReturn<boolean, WASM.Event, EventInspectHook>> => {
      const hook: HookWithSubscription<WASM.Event> = new EventInspectHook();
      const added = await device.addHookOnNewEvent(hook);
      return [added, hook];
    },

    checkActionSuccess: async (hookAdded: boolean) => {
      return hookAdded;
    },
    ifFail: {
      message: 'Failed to add hook upon event',
      timeout,
    },
  };
  return ac;
}

export function runVMAction(timeout: number): Action<boolean> {
  const act = {
    description: 'Run VM',

    doAction: async (device: WARDuinoVM): Promise<boolean> => {
      return device.run();
    },

    checkActionSuccess: async (running: boolean): Promise<boolean> => {
      return running;
    },
    ifFail: {
      message: 'Failed to run device',
      timeout,
    },
  };
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
    ifFail: {
      message: `failed to mock primitive function ${funcid}`,
      timeout,
    },
  };

  return act;
}

export function addEventAction(
  topic: string,
  payload: string,
  timeout: number,
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
    ifFail: {
      message: `failed to add event to device`,
      timeout,
    },
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
    ifFail: {
      message: `failed to update callbacks mapping`,
      timeout,
    },
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
    ifFail: {
      message: `failed to step in VM within the ${timeout} time`,
      timeout,
    },
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
    ifFail: {
      message: `ProxyCall failed within the ${timeout} time`,
      timeout,
    },
  };

  return act;
}
