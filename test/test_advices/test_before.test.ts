import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';

describe('Test before', function () {
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

  it('before fac(5) should be executed 5 times', async () => {
    const facFunc = wasm.getFunction(0)!;
    const firstInstr = facFunc.allInstructions[0];
    let calls = 0;
    analysis.before(firstInstr, () => calls++);
    await analysis.deploy();
    await analysis.run();
    expect(calls).equal(5);
  });

  it('before fac(5) should give argument 5', async () => {
    const mainFunc = wasm.getMainFunction();
    const callFac = mainFunc.allInstructions[1];
    let providedArgs: ReadOnlyWasmValue[] = [];
    analysis.before(
      callFac,
      (_i: WasmInstruction, args: ReadOnlyWasmValue[]) => {
        providedArgs = args;
      },
    );
    await analysis.deploy();
    await analysis.run();

    expect(providedArgs.length).equal(1);
    expect(providedArgs[0].value).equal(5);
  });
});
