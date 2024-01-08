import { DeviceManager } from '../../src/device/device_manager';
import { type WARDuinoDevVM } from '../../src/warduino/vm/dev_vm';
import { StateRequest } from '../../src/warduino/requests/inspect_request';
import { type VMConfigArgs } from '../../src/device/vm_config';

describe('Snapshot Request', () => {
  let deviceManager: DeviceManager | undefined;
  let vm: WARDuinoDevVM | undefined;

  before(async () => {
    deviceManager = new DeviceManager();
    const vmName = 'DevVM';
    const vmID = '1';
    const vmConfigArgs: VMConfigArgs = {
      program: './test/data/test-example.wat',
      disableStrictModuleLoad: true,
    };

    vm = await deviceManager.spawnDevelopmentVM(
      vmName,
      vmID,
      vmConfigArgs,
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
