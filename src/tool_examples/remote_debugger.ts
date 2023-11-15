import { parseDeviceConfig, DeviceMode } from '../device/device_config';
import { DeviceManager } from '../device/device_manager';
import { getGlobalLogger } from '../logger/logger';
import { InspectStateHook } from '../hooks/hook_inspect_state';
import { PauseVMHook } from '../hooks/hook_run_pause';
import {
  type MonitorWasmAddrResponse,
  MontiroWasmAddrRequest,
  RemoveMonitorWasmAddrRequest,
} from '../warduino/requests/monitor_request';
import {
  StateRequest,
  type WasmState,
} from '../warduino/requests/inspect_request';
import {
  type RequestMessage,
  ResponseType,
} from '../warduino/api/request_interface';
import { WATSourceMap } from '../language_parsers/wat_source_map';
import { type EmulatedWARDuinoVM } from '../warduino/vm/emulated_vm';

export function allSucceeded(replies: MonitorWasmAddrResponse[]): boolean {
  let idx = 0;
  while (idx < replies.length) {
    const reply = replies[idx];
    if (reply.responseType !== ResponseType.SuccessResponse) {
      return false;
    }
    idx++;
  }
  return true;
}

export function logReplies(replies: RequestMessage[]): void {
  replies.forEach((reply) => {
    if (reply.responseType === ResponseType.SuccessResponse) {
      getGlobalLogger().debug(`SucessResponse(interrupt=${reply.interrupt})`);
    } else if (reply.responseType === ResponseType.ErrorResponse) {
      getGlobalLogger().debug(
        `ErrorResponse(interrupt=${reply.interrupt}, error_code=${reply.error_code})`,
      );
    } else if (reply.responseType === ResponseType.SubscriptionResponse) {
      getGlobalLogger().debug(
        `SubscriptionMessage(interrupt=${reply.interrupt}, sub=${reply.sub})`,
      );
    }
  });
}

function onBreakpointStateUpdate(
  em: EmulatedWARDuinoVM,
): (state: WasmState) => void {
  return (state: WasmState) => {
    em.step()
      .then(async (v) => {
        const sr = new StateRequest().includePC();
        await em.sendRequest<WasmState>(sr);
        await em.run();
      })
      .catch(console.error);
  };
}

export async function addBreakpoint(
  address: number,
  sourceMap: WATSourceMap,
  em: EmulatedWARDuinoVM,
  onBreakPointReached: (data: WasmState) => void,
): Promise<boolean> {
  const opcode = sourceMap.getOpcode(address);
  if (opcode === undefined) {
    return false;
  }

  const pauseHook = new PauseVMHook();
  const requestPause = new MontiroWasmAddrRequest(address)
    .before()
    .addHook(pauseHook);

  const stateOnBreakpoint = new StateRequest()
    .includeStack()
    .includePC()
    .includeGlobals()
    .includeCallstack()
    .includeEvents();
  const inspectHook = new InspectStateHook(stateOnBreakpoint);
  inspectHook.onSubscriptionData = onBreakPointReached;

  const requestInspect = new MontiroWasmAddrRequest(address)
    .before()
    .addHook(inspectHook);

  const requests = [requestPause, requestInspect];
  const replies = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(replies);
  return allSucceeded(replies);
}

export function snapshotRequest(): StateRequest {
  const request = new StateRequest()
    .includePC()
    .includeBreakpoints()
    .includeCallstack()
    .includeGlobals()
    .includeTable()
    .includeMemory()
    .includeBranchingTable()
    .includeStack()
    .includeCallbackMappings()
    .includeEvents();
  return request;
}

export async function addBreakpointSnapshot(
  address: number,
  sourceMap: WATSourceMap,
  em: EmulatedWARDuinoVM,
): Promise<boolean> {
  const opcode = sourceMap.getOpcode(address);
  if (opcode === undefined) {
    return false;
  }

  const pauseHook = new PauseVMHook();
  const requestPause = new MontiroWasmAddrRequest(address)
    .before()
    .addHook(pauseHook);

  const inspectHook = new InspectStateHook(snapshotRequest());
  inspectHook.onSubscriptionData = console.log;

  const requestInspect = new MontiroWasmAddrRequest(address)
    .before()
    .addHook(inspectHook);

  const requests = [requestPause, requestInspect];
  const replies = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(replies);
  return allSucceeded(replies);
}

export async function removeBreakpoint(
  address: number,
  sourceMap: WATSourceMap,
  em: EmulatedWARDuinoVM,
): Promise<boolean> {
  const opcode = sourceMap.getOpcode(address);
  if (opcode === undefined) {
    return false;
  }
  const request = new RemoveMonitorWasmAddrRequest(address).before();

  const reply = await em.sendRequest(request, 1000);
  logReplies([reply]);
  return true;
}

export async function runDebugScenario(
  wasmApp: string,
  spawn: boolean,
): Promise<EmulatedWARDuinoVM | undefined> {
  const dc = parseDeviceConfig({
    program: wasmApp,
    mode: DeviceMode.Emulate,
    port: '8300',
    id: '1',
    name: 'emulator',
  });

  if (dc === undefined) {
    return undefined;
  }

  const sourceMap = await WATSourceMap.fromPath(app);
  if (sourceMap === undefined) {
    return undefined;
  }

  const dm = new DeviceManager();

  const em = spawn
    ? await dm.spawnEmulator(dc, 8000)
    : await dm.connectToExistingEmulator(dc, 8000);
  const funcCallHardwareSetup = 463;
  const i32const5000 = 408;
  const i32const12 = 411;
  const funcCallChipLedCSetupCall = 413;
  if (
    !(await addBreakpoint(
      funcCallHardwareSetup,
      sourceMap,
      em,
      onBreakpointStateUpdate(em),
    ))
  ) {
    return undefined;
  }
  if (
    !(await addBreakpoint(
      i32const5000,
      sourceMap,
      em,
      onBreakpointStateUpdate(em),
    ))
  ) {
    return undefined;
  }
  if (
    !(await addBreakpoint(
      i32const12,
      sourceMap,
      em,
      onBreakpointStateUpdate(em),
    ))
  ) {
    return undefined;
  }
  // if (!(await removeBreakpoint(i32const5000, sourceMap, em))) {
  //   return undefined;
  // }
  if (
    !(await addBreakpoint(
      funcCallChipLedCSetupCall,
      sourceMap,
      em,
      onBreakpointStateUpdate(em),
    ))
  ) {
    return undefined;
  }
  await em.run();
  return em;
}

const app = './example-wat/test-example.diss';
runDebugScenario(app, false)
  .then((_) => {})
  .catch(console.error);
