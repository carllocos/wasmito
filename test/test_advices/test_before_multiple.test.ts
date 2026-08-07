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

describe('Test Multiple before advices on same Instruction', function () {
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

  it('registering multiple advices before fac(5) should execute each once', async () => {
    const mainFunc = wasm.getMainFunction();
    const callFac = mainFunc.allInstructions[1];
    let adviceOneCalled = 0;
    let adviceTwoCalled = 0;
    let adviceThreeCalled = 0;
    analysis.before(callFac, () => adviceOneCalled++);
    analysis.before(callFac, () => adviceTwoCalled++);
    analysis.before(callFac, () => adviceThreeCalled++);

    await analysis.deploy();
    await analysis.run();
    expect(adviceOneCalled).equal(1);
    expect(adviceTwoCalled).equal(1);
    expect(adviceThreeCalled).equal(1);
  });

  it('change before fac(5) to fac(1) then to fac(3)', async () => {
    const mainFunc = wasm.getMainFunction();
    const callFac = mainFunc.allInstructions[1];
    let val1: number | undefined;
    let val2: number | undefined;
    let val3: number | undefined;
    let val4: number | undefined;

    analysis.beforeMut(
      callFac,
      (_i: WasmInstruction, args: WritableWasmValue[]) => {
        val1 = args[0].value;
        args[0].value = 1;
        return args;
      },
    );

    analysis.beforeMut(
      callFac,
      (_i: WasmInstruction, args: WritableWasmValue[]) => {
        val2 = args[0].value;
        args[0].value = 3;
        return args;
      },
    );

    analysis.before(
      callFac,
      (_i: WasmInstruction, args: ReadOnlyWasmValue[]) => {
        val3 = args[0].value;
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

  it('read argument fac(5) and then change to fac(1) then read argument', async () => {
    const mainFunc = wasm.getMainFunction();
    const callFac = mainFunc.allInstructions[1];
    let val1: number | undefined;
    let val2: number | undefined;
    let val3: number | undefined;
    let val4: number | undefined;

    analysis.before(
      callFac,
      (_i: WasmInstruction, args: ReadOnlyWasmValue[]) => {
        val1 = args[0].value;
        return args;
      },
    );

    analysis.beforeMut(
      callFac,
      (_i: WasmInstruction, args: WritableWasmValue[]) => {
        val2 = args[0].value;
        args[0].value = 3;
        return args;
      },
    );

    analysis.before(
      callFac,
      (_i: WasmInstruction, args: ReadOnlyWasmValue[]) => {
        val3 = args[0].value;
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
  it('write argument fac(5) to fac(2), then read argument, and read argument', async () => {
    const mainFunc = wasm.getMainFunction();
    const callFac = mainFunc.allInstructions[1];
    let val1: number | undefined;
    let val2: number | undefined;
    let val3: number | undefined;
    let val4: number | undefined;

    analysis.beforeMut(
      callFac,
      (_i: WasmInstruction, args: WritableWasmValue[]) => {
        val1 = args[0].value;
        args[0].value = 2;
        return args;
      },
    );

    analysis.before(
      callFac,
      (_i: WasmInstruction, args: ReadOnlyWasmValue[]) => {
        val2 = args[0].value;
        return args;
      },
    );

    analysis.before(
      callFac,
      (_i: WasmInstruction, args: ReadOnlyWasmValue[]) => {
        val3 = args[0].value;
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
