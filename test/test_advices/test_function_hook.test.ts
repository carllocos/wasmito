import { expect } from 'chai';
import path from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';
import { spawnDevVM } from '../../tool_examples/spawn_vm';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmitoBackendVM } from '../../src/runtimes/wasmito_vm/wasmito_vm';

describe('Hooking directly on a WASMFunction and on WasmCode.Struct.Func', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', async () => {
    const wasmPath = path.resolve('./test/data/wat/fac/fac.wasm');
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('`before` a WASMFunction reports the function and its own call arguments', async () => {
    const factorial = wasm.getFunction(0)!;
    const seenArgs: number[] = [];
    let seenFunc: WASMFunction | undefined;
    analysis.before(
      factorial,
      (f: any, args: ReadOnlyWasmValue[]) => {
        seenFunc = f;
        expect(args.length).to.equal(1);
        seenArgs.push(Number(args[0].value));
      },
    );
    await analysis.deploy();
    await analysis.run();

    expect(seenFunc).to.equal(factorial);
    expect(seenArgs).to.deep.equal([5, 4, 3, 2, 1]);
  });

  it('`after` a WASMFunction reports the function and its own return value', async () => {
    const factorial = wasm.getFunction(0)!;
    const seenResults: number[] = [];
    let seenFunc: WASMFunction | undefined;
    analysis.after(
      factorial,
      (f: any, result: ReadOnlyWasmValue | undefined) => {
        seenFunc = f;
        seenResults.push(Number(result?.value));
      },
    );
    await analysis.deploy();
    await analysis.run();

    expect(seenFunc).to.equal(factorial);
    expect(seenResults).to.deep.equal([1, 2, 6, 24, 120]);
  });

  it('`WasmCode.Struct.Func` hooks `before` every function of the module', async () => {
    const seenFuncIds: number[] = [];
    analysis.before(WasmCode.Struct.Func, (f: any, _args: any) => {
      seenFuncIds.push(f.id);
    });
    await analysis.deploy();
    await analysis.run();

    const factorial = wasm.getFunction(0)!;
    const main = wasm.getMainFunction();
    const calls = (id: number) =>
      seenFuncIds.filter((seen) => seen === id).length;
    expect(calls(factorial.id)).to.equal(5);
    expect(calls(main.id)).to.equal(1);
  });
});

describe('`before` a WASMFunction whose first body instruction is itself a Loop', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', async () => {
    const wasmPath = path.resolve(
      './test/data/wat/loop_first_instr/loop_first_instr.wasm',
    );
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('fires exactly once per call, not once per loop iteration', async () => {
    const loopy = wasm.functions.find((f) => f.name === 'loopy')!;
    const seenArgs: number[] = [];
    analysis.before(loopy, (_f: any, args: ReadOnlyWasmValue[]) => {
      seenArgs.push(Number(args[0].value));
    });
    await analysis.deploy();
    await analysis.run();

    // `main` calls `loopy(5)`, whose loop iterates 5 times internally.
    // A single call must produce a single `before` report, carrying
    // `loopy`'s own argument -- not one report per loop iteration.
    expect(seenArgs).to.deep.equal([5]);
  });
});

describe('`before` a WASMFunction that declares its own locals', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', async () => {
    const wasmPath = path.resolve(
      './test/data/wat/locals_arity/locals_arity.wasm',
    );
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('reports the params themselves, not the tail of the params+locals layout', async () => {
    const sum3 = wasm.functions.find((f) => f.name === 'sum3')!;
    let seenValues: number[] = [];
    analysis.before(sum3, (_f: any, args: ReadOnlyWasmValue[]) => {
      seenValues = args.map((a) => Number(a.value));
    });
    await analysis.deploy();
    await analysis.run();

    // `main` calls `sum3(1, 2, 3)`. `sum3` also declares an extra unused
    // local: the VM reports the params followed by that local as one
    // contiguous region, so naively taking the last 3 entries would
    // wrongly grab [b, c, tmp] instead of the actual params [a, b, c].
    expect(seenValues).to.deep.equal([1, 2, 3]);
  });

  it('`after` still reports the real return value, unaffected by the extra local', async () => {
    const sum3 = wasm.functions.find((f) => f.name === 'sum3')!;
    let seenResult: number | undefined;
    analysis.after(sum3, (_f: any, result: ReadOnlyWasmValue | undefined) => {
      seenResult = Number(result?.value);
    });
    await analysis.deploy();
    await analysis.run();

    expect(seenResult).to.equal(6);
  });
});

describe('`after` a WASMFunction that exits through an early `return`', function () {
  let wasm: WasmModule;
  let vmConnection: WasmitoBackendVM;
  let analysis: WasmAnalysis;
  this.timeout(0);

  before('Parse Module', async () => {
    const wasmPath = path.resolve(
      './test/data/wat/early_return/early_return.wasm',
    );
    wasm = new WasmModule(wasmPath);
  });

  beforeEach(async () => {
    vmConnection = await spawnDevVM(wasm);
    analysis = new WasmAnalysis(wasm, vmConnection);
  });

  it('the VM still executes the function`s own closing `end`, so `after` still fires exactly once per call, with the right result, whether the call took the early-`return` path or the natural fall-through path', async () => {
    const absFunc = wasm.functions.find(
      (f) => f.name === 'abs_early_return',
    )!;
    // `abs_early_return`'s body ends with a plain `end` instruction, not
    // the `return` inside its `if`: `after` this WASMFunction hooks that
    // trailing `end`, exactly like it would for any other function.
    const endInstr = absFunc.body[absFunc.body.length - 1];
    expect(endInstr.name).to.equal('end');

    // `main` calls `abs_early_return(-5)` (takes the early `return`) and
    // then `abs_early_return(3)` (falls through to the closing `end`
    // naturally). Directly hooking the `return` and the closing `end`
    // confirms which path each call actually took, and that the VM visits
    // the closing `end` on BOTH calls regardless of the earlier `return`.
    const returnInstr = absFunc.allInstructions.find(
      (i) => i.name === 'return',
    )!;
    let returnHits = 0;
    let endHitsDirect = 0;
    analysis.before(returnInstr, () => {
      returnHits++;
    });
    analysis.before(endInstr, () => {
      endHitsDirect++;
    });

    const seenResults: number[] = [];
    let afterHits = 0;
    analysis.after(
      absFunc,
      (_f: any, result: ReadOnlyWasmValue | undefined) => {
        afterHits++;
        seenResults.push(Number(result?.value));
      },
    );

    await analysis.deploy();
    await analysis.run();

    // The early-return path was taken exactly once (for n = -5)...
    expect(returnHits).to.equal(1);
    // ...but the VM still visits the closing `end` on every call, early
    // return or not, which is exactly why `after` keeps working.
    expect(endHitsDirect).to.equal(2);
    expect(afterHits).to.equal(2);
    expect(seenResults).to.deep.equal([5, 3]);
  });
});
