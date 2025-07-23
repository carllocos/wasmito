import { DeviceManager } from '../../src/device/device_manager';
import { type WasmitoDevVM } from '../../src/runtimes/wasmito_vm/dev_vm';
import { StateRequest } from '../../src/runtimes/wasmito_vm/requests/inspect_request';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import { createDevPlatform } from '../../src/platforms/platformbuilder_factory';
import { type WATCompilerArgs } from '../../src';

describe('Snapshot Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WasmitoDevVM | undefined;
  const program = './test/data/test-example.wat';

  before(async () => {
    deviceManager = new DeviceManager();
    const platform = await createDevPlatform({
      selectedLanguage: {
        targetLanguage: TargetLanguage.WAT,
      },
    });
    const compilationArgs: WATCompilerArgs = {
      sourceCodePath: program,
    };
    vm = await deviceManager.spawnDevelopmentVM(
      platform,
      compilationArgs,
      3000,
    );
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

  after(async () => {
    if (deviceManager !== undefined && vm !== undefined) {
      await deviceManager?.closeVM(vm);
    }
  });
});
