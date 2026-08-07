import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';

describe('Test after', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', async () => {
    const wasmPath = path.resolve('./test/data/wat/fac/fac.wasm');
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm); // for local VM
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('after fac(5) should be executed 5 times', async () => {
    const facFunc = wasm.getFunction(0)!;
    const firstInstr = facFunc.allInstructions[0];
    let calls = 0;
    analysis.after(firstInstr, () => calls++);
    await analysis.deploy();
    await analysis.run();
    expect(calls).equal(5);
  });

  it('after fac(5) should give argument 120', async () => {
    const mainFunc = wasm.getMainFunction();
    const callFac = mainFunc.allInstructions[1];
    let facResult: number | undefined;
    analysis.after(
      callFac,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        facResult = result?.value;
      },
    );
    await analysis.deploy();
    await analysis.run();

    expect(facResult).equal(120);
  });
});
