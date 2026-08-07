import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  ReadOnlyWasmValue,
  WritableWasmValue,
} from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';

describe('Test after Mutability', function () {
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

  it('change argument passed to fac(5) to be fac(1)', async () => {
    const mainFunc = wasm.getMainFunction();
    const i32ConstFacArg = mainFunc.allInstructions[0];
    const callFac = mainFunc.allInstructions[1];

    let val1: number | undefined;
    let val2: number | undefined;
    analysis.afterMut(
      i32ConstFacArg,
      (_i: WasmInstruction, arg: WritableWasmValue | undefined) => {
        val1 = arg?.value;

        if (arg !== undefined) arg.value = 1;
        return arg;
      },
    );

    analysis.after(
      callFac,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val2 = result?.value;
      },
    );

    await analysis.deploy();
    await analysis.run();
    expect(val1).equal(5);
    expect(val2).equal(1);
  });
});
