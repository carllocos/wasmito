import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { waitMilliSeconds } from '../../src/util/promise_util';

describe('Test order advices Interrupt', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);
  const pinNumber = 37;

  before('Parse Module', async () => {
    const wasmPath = path.resolve('./test/data/wat/toggle_led/toggle_led.wasm');
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm); // for local VM
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('On new interrupt advice runs first, then before handling interrupt advice', async () => {
    const orderCalled: number[] = [];
    analysis.beforeHandlingInterrupt(() => orderCalled.push(2));
    analysis.onNewInterrupt(() => orderCalled.push(1));

    await analysis.deploy();
    analysis.run(); // the toggleLed has an infinite loop so need to await
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt handler got registered
    await vmConnection.simulateInterrupt(pinNumber);
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt got handled
    await analysis.close();
    expect(orderCalled.length).equal(2);
    expect(orderCalled[0]).equal(1);
    expect(orderCalled[1]).equal(2);
  });

  it('Multiple On new interrupt advice run first, then before handling interrupt advices', async () => {
    const orderCalled: number[] = [];
    analysis.beforeHandlingInterrupt(() => {
      orderCalled.push(3);
    });
    analysis.beforeHandlingInterrupt(() => {
      orderCalled.push(4);
    });
    analysis.beforeHandlingInterrupt(() => {
      orderCalled.push(5);
    });

    analysis.onNewInterrupt(() => {
      orderCalled.push(0);
    });
    analysis.onNewInterrupt(() => {
      orderCalled.push(1);
    });
    analysis.onNewInterrupt(() => {
      orderCalled.push(2);
    });

    await analysis.deploy();
    analysis.run(); // the toggleLed has an infinite loop so need to await
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt handler got registered
    await vmConnection.simulateInterrupt(pinNumber);
    // await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt got handled
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt got handled
    await analysis.close();
    expect(orderCalled.length).equal(6);
    for (let idx = 0; idx < orderCalled.length; idx++) {
      expect(orderCalled[idx]).equal(idx);
    }
  });
});
