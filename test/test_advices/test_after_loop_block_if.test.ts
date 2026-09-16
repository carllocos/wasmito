import { expect } from 'chai';
import assert from 'assert';
import path from 'path';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import {
  isBlockInstruction,
  isIfInstruction,
  isLoopInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';

describe('Registering advices `after` a Loop, Block and If', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', () => {
    const wasmPath = path.resolve(
      './test/data/wat/control_flow_after/control_flow_after.wasm',
    );
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('runs the after-advice of a Loop, Block and If only once, after the whole construct (all loop iterations included) has finished', async () => {
    const mainFunc = wasm.getMainFunction();
    const loopInstr = mainFunc.allInstructions.find(isLoopInstruction);
    const blockInstr = mainFunc.allInstructions.find(isBlockInstruction);
    const ifInstr = mainFunc.allInstructions.find(isIfInstruction);
    assert(loopInstr !== undefined, 'fixture is expected to have a loop');
    assert(blockInstr !== undefined, 'fixture is expected to have a block');
    assert(ifInstr !== undefined, 'fixture is expected to have an if');

    // `local.set $sum` executes exactly once per loop iteration
    const iterationInstr = loopInstr.subInstructions.find((i) =>
      i.hasOpcode(WasmCode.LocalSet),
    );
    assert(
      iterationInstr !== undefined,
      'expected the loop body to update a local on every iteration',
    );

    const orderCalled: string[] = [];
    analysis.before(iterationInstr, () => orderCalled.push('iteration'));
    analysis.after(loopInstr, () => orderCalled.push('loop-end'));
    analysis.after(blockInstr, () => orderCalled.push('block-end'));
    analysis.after(ifInstr, () => orderCalled.push('if-end'));

    await analysis.deploy();
    await analysis.run();
    await analysis.close();

    expect(orderCalled).to.deep.equal([
      'iteration',
      'iteration',
      'iteration',
      'iteration',
      'iteration',
      'loop-end',
      'block-end',
      'if-end',
    ]);
  });
});
