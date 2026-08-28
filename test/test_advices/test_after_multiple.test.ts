import { expect } from 'chai';
import path from 'path';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import {
  ReadOnlyWasmValue,
  WritableWasmValue,
} from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';

describe('Test Multiple after advices on same Instruction', function () {
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

  it('registering multiple advices after fac(5) should execute each once', async () => {
    const mainFunc = wasm.getMainFunction();
    const callFac = mainFunc.allInstructions[1];
    let adviceOneCalled = 1;
    let adviceTwoCalled = 2;
    let adviceThreeCalled = 3;
    analysis.after(callFac, () => adviceOneCalled++);
    analysis.after(callFac, () => adviceTwoCalled++);
    analysis.after(callFac, () => adviceThreeCalled++);

    await analysis.deploy();
    await analysis.run();
    expect(adviceOneCalled).equal(2);
    expect(adviceTwoCalled).equal(3);
    expect(adviceThreeCalled).equal(4);
  });

  it('change before fac(5) to fac(1) then to fac(3)', async () => {
    const mainFunc = wasm.getMainFunction();
    const i32ConstFacArg = mainFunc.allInstructions[0];
    const callFac = mainFunc.allInstructions[1];
    let val1: bigint | number | undefined;
    let val2: bigint | number | undefined;
    let val3: bigint | number | undefined;
    let val4: bigint | number | undefined;

    analysis.afterMut(
      i32ConstFacArg,
      (_i: WasmInstruction, result: WritableWasmValue | undefined) => {
        val1 = result?.value;
        if (result !== undefined) result.value = 1;
        return result;
      },
    );

    analysis.afterMut(
      i32ConstFacArg,
      (_i: WasmInstruction, result: WritableWasmValue | undefined) => {
        val2 = result?.value;
        if (result !== undefined) result.value = 3;
        return result;
      },
    );

    analysis.after(
      i32ConstFacArg,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val3 = result?.value;
      },
    );

    analysis.after(
      callFac,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val4 = result?.value;
      },
    );

    await analysis.deploy();
    await analysis.run();

    expect(val1).equal(5);
    expect(val2).equal(1);
    expect(val3).equal(3);
    expect(val4).equal(6);
  });

  it('read after i32const 5, then change it to 32const 1, then read argument i32const', async () => {
    const mainFunc = wasm.getMainFunction();
    const i32ConstFacArg = mainFunc.allInstructions[0];
    const callFac = mainFunc.allInstructions[1];
    let val1: bigint | number | undefined;
    let val2: bigint | number | undefined;
    let val3: bigint | number | undefined;
    let val4: bigint | number | undefined;

    analysis.after(
      i32ConstFacArg,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val1 = result?.value;
        return result;
      },
    );

    analysis.afterMut(
      i32ConstFacArg,
      (_i: WasmInstruction, result: WritableWasmValue | undefined) => {
        val2 = result?.value;
        if (result !== undefined) result.value = 3;
        return result;
      },
    );

    analysis.after(
      i32ConstFacArg,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val3 = result?.value;
        return result;
      },
    );

    analysis.after(
      callFac,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val4 = result?.value;
      },
    );

    await analysis.deploy();
    await analysis.run();

    expect(val1).equal(5);
    expect(val2).equal(5);
    expect(val3).equal(3);
    expect(val4).equal(6);
  });

  it('write i32.const 5 to i32.const 2, then read i32.const twice in a row', async () => {
    const mainFunc = wasm.getMainFunction();
    const i32ConstFacArg = mainFunc.allInstructions[0];
    const callFac = mainFunc.allInstructions[1];
    let val1: bigint | number | undefined;
    let val2: bigint | number | undefined;
    let val3: bigint | number | undefined;
    let val4: bigint | number | undefined;

    analysis.afterMut(
      i32ConstFacArg,
      (_i: WasmInstruction, result: WritableWasmValue | undefined) => {
        val1 = result?.value;
        if (result !== undefined) result.value = 2;
        return result;
      },
    );

    analysis.after(
      i32ConstFacArg,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val2 = result?.value;
        return result;
      },
    );

    analysis.after(
      i32ConstFacArg,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val3 = result?.value;
        return result;
      },
    );

    analysis.after(
      callFac,
      (_i: WasmInstruction, result: ReadOnlyWasmValue | undefined) => {
        val4 = result?.value;
      },
    );

    await analysis.deploy();
    await analysis.run();

    expect(val1).equal(5);
    expect(val2).equal(2);
    expect(val3).equal(2);
    expect(val4).equal(2);
  });
});
