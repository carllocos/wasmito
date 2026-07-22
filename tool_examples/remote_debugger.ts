import { Breakpoint } from '../src/debugger/breakpoint';
import { DeviceManager } from '../src/device/device_manager';
import { getGlobalLogger } from '../src/logger/logger';
import { createDevPlatform } from '../src/platforms/platformbuilder_factory';
import { type SourceMap } from '../src/source_mappers/source_map';
import { RemoveHookOnWasmAddrRequest } from '../src/runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import { StateRequest } from '../src/runtimes/wasmito_vm/requests/inspect_request';
import { type WasmitoDevVM } from '../src/runtimes/wasmito_vm/dev_vm';
import { type WasmState } from '../src/webassembly/wasm';
import { LanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import { resolve } from 'path';
import { RequestMessage, ResponseType } from '../src/runtimes/request_msg';
import { isSuccessfulReply } from '../src/runtimes/wasmito_vm/requests/around_function_request';

export function allSucceeded(replies: RequestMessage[]): boolean {
  let idx = 0;
  while (idx < replies.length) {
    const reply = replies[idx];
    if (!isSuccessfulReply(reply)) {
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

function onBreakpointStateUpdate(em: WasmitoDevVM): (state: WasmState) => void {
  return (_state: WasmState) => {
    em.step()
      .then(async (_v) => {
        const sr = new StateRequest().includePC();
        await em.sendRequest<WasmState>(sr);
        await em.run();
      })
      .catch(console.error);
  };
}

export async function addBreakpoint(
  lineNr: number,
  em: WasmitoDevVM,
  onBreakPointReached: (data: WasmState) => void,
): Promise<boolean> {
  const stateOnBreakpoint = new StateRequest()
    .includeStack()
    .includePC()
    .includeGlobals()
    .includeCallstack()
    .includeEvents();
  const bp = new Breakpoint(
    { source: '', linenr: lineNr, colnr: 0, name: '', address: 0 },
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
  em: WasmitoDevVM,
  onBreakPointReached: (data: WasmState) => void,
): Promise<boolean> {
  const bp = new Breakpoint(
    { source: '', linenr, colnr: 0, name: '', address: 0 },
    snapshotRequest(),
  );
  bp.subscribe(onBreakPointReached);
  return em.addBreakpoint(bp);
}

export async function removeBreakpoint(
  address: number,
  sourceMap: SourceMap,
  em: WasmitoDevVM,
): Promise<boolean> {
  const instruction = sourceMap.wasm.instructionFromAddress(address);
  if (instruction === undefined) {
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
): Promise<WasmitoDevVM | undefined> {
  const toolPort = 8000;
  const maxWaitTime = 3000;

  const platform = await createDevPlatform(
    {
      vmConfig: {
        toolPort,
      },
    },
    outputDir,
  );
  const la = LanguageAdaptor.emptyAdaptor(wasmApp);

  const dm = new DeviceManager();
  const em = connectToExistingProcess
    ? await dm.connectToExistingDevVM(la, platform, maxWaitTime)
    : await dm.spawnDevelopmentVM(la, platform);
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

const appDir = resolve('./app_examples/wat/dimmer/');
const app = resolve(appDir, 'dimmer.wasm');
const output = resolve(appDir, '/wasm/');
const connectToExistingProcess = false;
runDebugScenario(app, connectToExistingProcess, output).catch(console.error);
