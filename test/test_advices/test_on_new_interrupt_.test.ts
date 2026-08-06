import { expect } from 'chai';
import path from 'path';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import { WASM } from '../../src/webassembly/wasm';
import {
  ReadOnlyInterrupt,
  WritableInterrupt,
} from '../../src/tool_api/interrupts';
import { waitMilliSeconds } from '../../src/util/promise_util';

describe('Test on new Interrupts', function () {
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

  it('before new interrupt advice should read topic and payload', async () => {
    let interrupt: undefined | WASM.Event;
    analysis.onNewInterrupt((i: ReadOnlyInterrupt) => {
      interrupt = i;
    });

    await analysis.deploy();
    analysis.run(); // the toggleLed has an infinite loop so need to await
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt handler got registered
    await vmConnection.simulateInterrupt(pinNumber);
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt got handled
    await analysis.close();
    expect(interrupt?.payload).equal('');
    expect(interrupt?.topic).equal(`interrupt_${pinNumber}`);
  });

  it('multiple advices before new interrupt should run sequentially', async () => {
    const orderCalled: number[] = [];
    analysis.onNewInterrupt(() => orderCalled.push(1));
    analysis.onNewInterrupt(() => orderCalled.push(2));
    analysis.onNewInterrupt(() => orderCalled.push(3));

    await analysis.deploy();
    analysis.run(); // the toggleLed has an infinite loop so need to await
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt handler got registered
    await vmConnection.simulateInterrupt(37);
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt got handled
    await analysis.close();
    expect(orderCalled.length).equal(3);
    expect(orderCalled[0]).equal(1);
    expect(orderCalled[1]).equal(2);
    expect(orderCalled[2]).equal(3);
  });

  it('before new interrupt mutability advice should allow edit topic and payload', async () => {
    let topic1 = '';
    let payload1 = 'nothing';
    let topic2 = '';
    let payload2 = 'nothing';
    analysis.onNewInterruptMut((i: WritableInterrupt) => {
      topic1 = i.topic;
      payload1 = i.payload;
      i.topic = 'new topic';
      i.payload = 'new payload';
      return i;
    });

    analysis.onNewInterrupt((i: ReadOnlyInterrupt) => {
      topic2 = i.topic;
      payload2 = i.payload;
      return i;
    });

    await analysis.deploy();
    analysis.run(); // the toggleLed has an infinite loop so need to await
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt handler got registered
    await vmConnection.simulateInterrupt(pinNumber);
    await waitMilliSeconds(1000); // wait 1 sec to be sure interrupt got handled
    await analysis.close();
    expect(topic1).equal(`interrupt_${pinNumber}`);
    expect(payload1).equal('');
    expect(topic2).equal('new topic');
    expect(payload2).equal('new payload');
  });
});
