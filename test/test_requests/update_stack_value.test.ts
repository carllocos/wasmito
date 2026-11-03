import { DeviceManager } from '../../src/device/device_manager';
import { StateRequest } from '../../src/runtimes/wasmito_vm/requests/inspect_request';
import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { UpdateStackValueRequest } from '../../src/runtimes/wasmito_vm/requests/update_stack_value';
import assert from 'assert';
import { WASM } from '../../src/webassembly/wasm';
import { Breakpoint } from '../../src/debugger/breakpoint';

async function main() {
  const program =
    '/Users/crojcas/Documents/projects/WARDuino-fork/build-emu/dim.wasm';

  const deviceManager = new DeviceManager();
  const langAdaptor = LanguageAdaptor.emptyAdaptor(program);
  const platform = await createDevPlatform({
    vmConfig: { toolPort: 8192, pauseOnStart: true },
  });
  const vm = await deviceManager.connectToExistingDevVM(
    langAdaptor,
    platform,
    3000,
  );

  const added = await vm?.addBreakpoint(
    new Breakpoint({
      linenr: -1,
      colnr: -1,
      address: 435,
      name: '',
      source: '',
    }),
  );
  assert(added);
  const run = await vm?.run();
  assert(run);

  const updateReq = new UpdateStackValueRequest(0, {
    type: WASM.Type.i32,
    value: -64,
  });
  const sent = await vm?.sendRequest(updateReq);
  assert(sent);
  const ireq = new StateRequest();
  ireq.includeStack();
  const s = await vm?.inspect(ireq);
  assert(s?.stack !== undefined);
  const sv = s.stack[0];
  assert(sv.type === WASM.Type.i32);
  assert(sv.value === -64);
  await deviceManager?.closeVM(vm);
}

main();
