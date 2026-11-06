import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Module } from 'wasmito-tools';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { WASM } from '../../src/webassembly/wasm';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import {
  ReadOnlyWasmValue,
  WritableWasmValue,
} from '../../src/tool_api/interrupts';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';

/*
 * test/data/wat/around/around.wat: without any around `main` returns
 *   add(2, 3) + bump() + block{100} + (g = 7; g)  =  5 + 1 + 100 + 7 = 113
 */
describe('around', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  let mainResult: number | undefined;
  this.timeout(0);

  let tmpDir: string;

  // $add is func 0 and $bump is func 1
  const funcIds: Record<string, number> = { $add: 0, $bump: 1 };
  const func = (name: string): WASMFunction => {
    const f = wasm.getFunction(funcIds[name]);
    expect(f, `function ${name}`).to.not.equal(undefined);
    return f!;
  };

  const mainInstr = (name: string, nth = 0): WasmInstruction =>
    wasm.getMainFunction().allInstructions.filter((i) => i.name === name)[nth];

  const i32 = (v: number) => WritableWasmValue.new(WASM.Type.i32, v);

  const observeMainResult = () => {
    analysis.after(
      wasm.getMainFunction(),
      (_f: WASMFunction, r: ReadOnlyWasmValue | undefined) => {
        mainResult = Number(r?.value);
      },
    );
  };

  before('Compile and parse module', async () => {
    const watPath = path.resolve('./test/data/wat/around/around.wat');
    const binary = Module.from_wat(
      watPath,
      fs.readFileSync(watPath, 'utf8'),
    ).bytes;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wasmito-around-'));
    const wasmPath = path.join(tmpDir, 'around.wasm');
    fs.writeFileSync(wasmPath, binary);
    wasm = new WasmModule(wasmPath);
  });

  after('Remove temporary directory', () => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    mainResult = undefined;
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  afterEach('Kill VM', async () => {
    // closes the channel and kills the VM process
    await vmConnection?.close();
  });

  it('without around main returns 113', async () => {
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(mainResult).to.equal(113);
  });

  it('replaces a whole function and receives its arguments', async () => {
    const add = func('$add');
    let seenFunc: WASMFunction | undefined;
    let seenArgs: number[] = [];
    analysis.around(add, (f: WASMFunction, args: WritableWasmValue[]) => {
      seenFunc = f;
      seenArgs = args.map((a) => Number(a.value));
      return i32(Number(args[0].value) * Number(args[1].value));
    });
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(seenFunc).to.equal(add);
    expect(seenArgs).to.deep.equal([2, 3]);
    // add(2, 3) replaced by 2 * 3
    expect(mainResult).to.equal(6 + 1 + 100 + 7);
  });

  it('skips the body of a replaced function', async () => {
    let bumpBodyExecuted = false;
    analysis.before(func('$bump').body[1], () => {
      bumpBodyExecuted = true;
    });
    analysis.around(func('$bump'), () => i32(40));
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(bumpBodyExecuted).to.equal(false);
    expect(mainResult).to.equal(5 + 40 + 100 + 7);
  });

  it('replaces a call instruction', async () => {
    const callBump = mainInstr('call', 1);
    let seenArgs: WritableWasmValue[] | undefined;
    analysis.around(
      callBump,
      (_i: WasmInstruction, args: WritableWasmValue[]) => {
        seenArgs = args;
        return i32(50);
      },
    );
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(seenArgs).to.deep.equal([]);
    expect(mainResult).to.equal(5 + 50 + 100 + 7);
  });

  it('replaces a plain instruction and continues with the next one', async () => {
    const firstAdd = mainInstr('i32.add', 0);
    let seenArgs: number[] = [];
    analysis.around(
      firstAdd,
      (_i: WasmInstruction, args: WritableWasmValue[]) => {
        seenArgs = args.map((a) => Number(a.value));
        return i32(Number(args[0].value) - Number(args[1].value));
      },
    );
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(seenArgs).to.deep.equal([5, 1]);
    expect(mainResult).to.equal(5 - 1 + 100 + 7);
  });

  it('replaces an instruction without result', async () => {
    let seenArgs: number[] = [];
    analysis.around(
      mainInstr('set_global'),
      (_i: WasmInstruction, args: WritableWasmValue[]) => {
        seenArgs = args.map((a) => Number(a.value));
      },
    );
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(seenArgs).to.deep.equal([7]);
    // g = 7 got skipped, so g still holds the value set by bump
    expect(mainResult).to.equal(5 + 1 + 100 + 1);
  });

  it('replaces a whole block (WasmCode.Struct.Block)', async () => {
    let calls = 0;
    analysis.around(WasmCode.Struct.Block, () => {
      calls++;
      return i32(1000);
    });
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(calls).to.equal(1);
    expect(mainResult).to.equal(5 + 1 + 1000 + 7);
  });

  it('async callbacks and the vm argument are supported', async () => {
    let gotVM = false;
    analysis.around(
      func('$add'),
      async (
        _f: WASMFunction,
        _args: WritableWasmValue[],
        vm: WasmitoBackendVM,
      ) => {
        gotVM = vm === vmConnection;
        return i32(0);
      },
    );
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(gotVM).to.equal(true);
    expect(mainResult).to.equal(0 + 1 + 100 + 7);
  });

  it('combines with before and after on the same function', async () => {
    const add = func('$add');
    const order: string[] = [];
    let beforeArgs: number[] = [];
    let aroundArgs: number[] = [];
    let afterResult: number | undefined;
    analysis.beforeMut(add, (_f: WASMFunction, args: WritableWasmValue[]) => {
      order.push('before');
      beforeArgs = args.map((a) => Number(a.value));
      args[0].value = 10;
      return args;
    });
    analysis.around(add, (_f: WASMFunction, args: WritableWasmValue[]) => {
      order.push('around');
      aroundArgs = args.map((a) => Number(a.value));
      return i32(Number(args[0].value) + Number(args[1].value) + 1);
    });
    analysis.after(
      add,
      (_f: WASMFunction, r: ReadOnlyWasmValue | undefined) => {
        order.push('after');
        afterResult = Number(r?.value);
      },
    );
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(order).to.deep.equal(['before', 'around', 'after']);
    expect(beforeArgs).to.deep.equal([2, 3]);
    // around sees the args as mutated by beforeMut
    expect(aroundArgs).to.deep.equal([10, 3]);
    expect(afterResult).to.equal(14);
    expect(mainResult).to.equal(14 + 1 + 100 + 7);
  });

  it('the last returned value wins when multiple arounds are registered', async () => {
    const add = func('$add');
    analysis.around(add, () => i32(1));
    analysis.around(add, () => undefined);
    analysis.around(add, () => i32(2));
    analysis.around(add, () => undefined);
    observeMainResult();
    await analysis.deploy();
    await analysis.run();
    expect(mainResult).to.equal(2 + 1 + 100 + 7);
  });

  it('fails when no value is returned for an instruction with a result', async () => {
    analysis.around(mainInstr('i32.add', 0), () => undefined);
    await analysis.deploy();
    let error: unknown;
    try {
      await analysis.run();
    } catch (e) {
      error = e;
    }
    expect(`${error}`).to.contain('must return a value');
  });

  it('fails when the returned value has the wrong type for a function', async () => {
    analysis.around(func('$add'), () =>
      WritableWasmValue.new(WASM.Type.i64, 1n),
    );
    await analysis.deploy();
    let error: unknown;
    try {
      await analysis.run();
    } catch (e) {
      error = e;
    }
    expect(`${error}`).to.contain('is expected');
  });

  it('rejects mixing a function around and an instruction around on the same address', () => {
    const add = func('$add');
    analysis.around(add, () => i32(0));
    expect(() => analysis.around(add.body[0], () => i32(0))).to.throw(
      /already registered/,
    );
  });
});
