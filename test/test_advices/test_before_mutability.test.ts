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

describe('Test before Mutability', function () {
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
    // vmConnection = await connectToExistingDevVM(wasm, 8192); // for local VM
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('fac(5) to fac(1)', async () => {
    const mainFunc = wasm.getMainFunction();
    const callFac = mainFunc.allInstructions[1];

    let val1: bigint | number | undefined;
    let val2: bigint | number | undefined;
    analysis.beforeMut(
      callFac,
      (_i: WasmInstruction, args: WritableWasmValue[]) => {
        val1 = args[0].value;
        args[0].value = 1;
        return args;
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
