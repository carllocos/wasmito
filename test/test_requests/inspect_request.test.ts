import { DeviceManager } from '../../src/device/device_manager';
import { type WasmitoDevVM } from '../../src/runtimes/wasmito_vm/dev_vm';
import { StateRequest } from '../../src/runtimes/wasmito_vm/requests/inspect_request';
import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { LanguageAdaptor } from '../../src/language_adaptors/language_adaptor';
import { resolve } from 'path';
import { expect } from 'chai';

describe('Inspect Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WasmitoDevVM | undefined;
  const program = resolve('./test/data/wat/dimmer/dimmer.wasm');

  before(async () => {
    deviceManager = new DeviceManager();
    const langAdaptor = LanguageAdaptor.emptyAdaptor(program);
    const platform = await createDevPlatform();
    vm = await deviceManager.spawnDevelopmentVM(langAdaptor, platform, 3000);
  });

  it('Inspecting pc', async () => {
    const request = new StateRequest();
    request.includePC();
    await vm?.inspect(request);
  });

  it('Inspecting stack', async () => {
    const request = new StateRequest();
    request.includeStack();
    await vm?.inspect(request);
  });

  it('Inspecting Branching Table', async () => {
    const request = new StateRequest();
    request.includeBranchingTable();
    await vm?.inspect(request);
  });

  it('Inspecting breakpoints', async () => {
    const request = new StateRequest();
    request.includeBreakpoints();
    await vm?.inspect(request);
  });

  it('Inspecting CallbackMappings', async () => {
    const request = new StateRequest();
    request.includeCallbackMappings();
    await vm?.inspect(request);
  });

  it('Inspecting callstack', async () => {
    const request = new StateRequest();
    request.includeCallstack();
    await vm?.inspect(request);
  });

  it('Inspecting events', async () => {
    const request = new StateRequest();
    request.includeEvents();
    await vm?.inspect(request);
  });

  it('Inspecting globals', async () => {
    const request = new StateRequest();
    request.includeGlobals();
    await vm?.inspect(request);
  });

  it('Inspecting memory', async () => {
    const request = new StateRequest();
    request.includeMemory();
    await vm?.inspect(request);
  });

  it('Inspecting Table', async () => {
    const request = new StateRequest();
    request.includeTable();
    await vm?.inspect(request);
  });

  it('Inspecting Heap Used', async () => {
    const request = new StateRequest();
    request.includeHeapFree();
    const s = await vm?.inspect(request);
    expect(s?.heapFree).to.not.equal(undefined);
  });

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeVM(vm);
    }
  });
});
