import { TargetLanguage } from '../src/compilers/prog_language_selection';
import { type WATCompilerArgs } from '../src/compilers/wat_compilers';
import { Breakpoint } from '../src/debugger/breakpoint';
import { DeviceManager } from '../src/device/device_manager';
import { getGlobalLogger } from '../src/logger/logger';
import { createDevPlatform } from '../src/platforms/platformbuilder_factory';
import { type SourceMap } from '../src/source_mappers/source_map';
import {
  type RequestMessage,
  ResponseType,
} from '../src/warduino/api/request_interface';
import {
  RemoveHookOnWasmAddrRequest,
  type HookOnWasmAddrResponse,
} from '../src/warduino/requests/hook_on_wasm_addr_request';
import { StateRequest } from '../src/warduino/requests/inspect_request';
import { type WARDuinoDevVM } from '../src/warduino/vm/dev_vm';
import { type WasmState } from '../src/webassembly/wasm';

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
  em: WARDuinoDevVM,
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
  em: WARDuinoDevVM,
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
): Promise<WARDuinoDevVM | undefined> {
  const toolPort = 8000;
  const maxWaitTime = 3000;

  const sourceCodeCompilerArgs: WATCompilerArgs = {
    sourceCodePath: wasmApp,
  };
  const platform = await createDevPlatform(
    {
      selectedLanguage: {
        targetLanguage: TargetLanguage.WAT,
      },
      vmConfig: {
        toolPort,
      },
    },
    outputDir,
  );

  const dm = new DeviceManager();
  const em = connectToExistingProcess
    ? await dm.connectToExistingDevVM(
        platform,
        sourceCodeCompilerArgs,
        maxWaitTime,
      )
    : await dm.spawnDevelopmentVM(platform, sourceCodeCompilerArgs);
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

const app = './src/tool_examples/wat_examples/dimmer-double-button.wat';
const output = './example-wat/';
const connectToExistingProcess = false;
runDebugScenario(app, connectToExistingProcess, output)
  .then((_) => {})
  .catch(console.error);
