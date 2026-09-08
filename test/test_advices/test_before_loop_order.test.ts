import { expect } from 'chai';
import assert from 'assert';
import path from 'path';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import { waitMilliSeconds } from '../../src/util/promise_util';
import { isLoopInstruction } from '../../src/webassembly/wasm/wasm_instruction';

describe('Test order of before advices on a Loop and its first sub-instruction', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', async () => {
    const wasmPath = path.resolve('./test/data/wat/toggle_led/toggle_led.wasm');
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('runs the Loop advice before the advice on its first sub-instruction, even when the sub-instruction advice was registered first', async () => {
    const mainFunc = wasm.getMainFunction();
    const loopInstr = mainFunc.allInstructions.find(isLoopInstruction);
    assert(
      loopInstr !== undefined,
      'toggle_led.wasm is expected to have a loop',
    );
    const firstSubInstr = loopInstr.subInstructions[0];

    const orderCalled: string[] = [];
    analysis.before(firstSubInstr, () => orderCalled.push('first-instr'));
    analysis.before(loopInstr, () => orderCalled.push('loop'));

    await analysis.deploy();
    analysis.run(); // toggle_led has an infinite loop, so don't await
    await waitMilliSeconds(500);
    await analysis.close();

    expect(orderCalled.length).to.be.at.least(2);
    expect(orderCalled[0]).equal('loop');
    expect(orderCalled[1]).equal('first-instr');
  });
});
