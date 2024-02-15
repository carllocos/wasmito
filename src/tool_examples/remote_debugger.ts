import { DeviceManager } from '../device/device_manager';
import { getGlobalLogger } from '../logger/logger';
import {
  type HookOnWasmAddrResponse,
  RemoveHookOnWasmAddrRequest,
} from '../warduino/requests/hook_on_wasm_addr_request';
import { StateRequest } from '../warduino/requests/inspect_request';
import {
  type RequestMessage,
  ResponseType,
} from '../warduino/api/request_interface';
import { type WATSourceMap } from '../source_mappers/wat/wat_source_map';
import { type WARDuinoDevVM } from '../warduino/vm/dev_vm';
import { type WasmState } from '../state/wasm';
import { type DeviceConfigArgs, DeploymentMode } from '../device/device_config';
import { type VMConfigArgs } from '../device/vm_config';
import { Breakpoint } from '../debugger';

export function allSucceeded(replies: HookOnWasmAddrResponse[]): boolean {
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
  em: WARDuinoDevVM,
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
  lineNr: number,
  em: WARDuinoDevVM,
  onBreakPointReached: (data: WasmState) => void,
): Promise<boolean> {
  const stateOnBreakpoint = new StateRequest()
    .includeStack()
    .includePC()
    .includeGlobals()
    .includeCallstack()
    .includeEvents();
  const bp = new Breakpoint(
    {
      linenr: lineNr,
    },
    stateOnBreakpoint,
  );
  bp.subscribe(onBreakPointReached);
  return em.addBreakpoint(bp);
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
  linenr: number,
  em: WARDuinoDevVM,
  onBreakPointReached: (data: WasmState) => void,
): Promise<boolean> {
  const bp = new Breakpoint(
    {
      linenr,
    },
    snapshotRequest(),
  );
  bp.subscribe(onBreakPointReached);
  return em.addBreakpoint(bp);
}

export async function removeBreakpoint(
  address: number,
  sourceMap: WATSourceMap,
  em: WARDuinoDevVM,
): Promise<boolean> {
  const opcode = sourceMap.getOpcode(address);
  if (opcode === undefined) {
    return false;
  }
  const request = new RemoveHookOnWasmAddrRequest(address).before();

  const reply = await em.sendRequest(request, 1000);
  logReplies([reply]);
  return true;
}

export async function runDebugScenario(
  wasmApp: string,
  connectToExistingProcess: boolean,
  outputDir: string,
): Promise<WARDuinoDevVM | undefined> {
  const toolPort = 8000;
  const maxWaitTime = 3000;

  const vmConfigArgs: VMConfigArgs = {
    program: wasmApp,
    toolPort,
    disableStrictModuleLoad: true,
  };

  const dc: DeviceConfigArgs = {
    deploymentMode: DeploymentMode.DevVM,
  };

  // program: wasmApp,
  const deviceName = undefined;
  const dm = new DeviceManager();
  const em = connectToExistingProcess
    ? await dm.connectToExistingDevVM(
        dc,
        toolPort,
        wasmApp,
        maxWaitTime,
        outputDir,
      )
    : await dm.spawnDevelopmentVM(
        vmConfigArgs,
        toolPort,
        deviceName,
        outputDir,
      );
  const sourceMap = em.getSourceMap();
  if (sourceMap === undefined) {
    return;
  }
  const funcCallHardwareSetup = 29;
  if (
    !(await addBreakpoint(
      funcCallHardwareSetup,
      em,
      onBreakpointStateUpdate(em),
    ))
  ) {
    return undefined;
  }
  // if (!(await addBreakpoint(i32const5000, em, onBreakpointStateUpdate(em)))) {
  //   return undefined;
  // }
  // if (
  //   !(await addBreakpoint(
  //     i32const12,
  //     sourceMap,
  //     em,
  //     onBreakpointStateUpdate(em),
  //   ))
  // ) {
  //   return undefined;
  // }
  // if (!(await removeBreakpoint(i32const5000, sourceMap, em))) {
  //   return undefined;
  // }
  // if (
  //   !(await addBreakpoint(
  //     funcCallChipLedCSetupCall,
  //     sourceMap,
  //     em,
  //     onBreakpointStateUpdate(em),
  //   ))
  // ) {
  //   return undefined;
  // }
  await em.run();
  return em;
}

const app = './example-wat/dim-using-temperature.wat';
const output = './example-wat/';
const connectToExistingProcess = false;
runDebugScenario(app, connectToExistingProcess, output)
  .then((_) => {})
  .catch(console.error);
