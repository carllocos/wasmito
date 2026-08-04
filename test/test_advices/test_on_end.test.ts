import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import {
  connectToExistingDevVM,
  spawnDevVM,
} from '../../tool_examples/spawn_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';

describe('Tetst before', function () {
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

  it('run advice after last instruction', async () => {
    const func = wasm.getMainFunction();
    const lastInstr = func.allInstructions[func.allInstructions.length - 1];
    analysis.after(
      lastInstr,
      (i: WasmInstruction, _result: ReadOnlyWasmValue | undefined) => {
        expect(i.startAddress === lastInstr.startAddress);
      },
    );

    await analysis.deploy();
    await analysis.run();
  });
});
