/***
 ** This is an implementation inspired by Wastrumentation's dynamic taint analysis
 ** (considers explicit/data-flow taint only, no control-flow taint).
 ** Original source file found in:
 ** github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/taint/src/lib.rs
 **
 ** Wastrumentation's advices literally *replace* each instruction's real
 ** semantics (they receive the operands and hand back what should really be
 ** pushed), so its analysis keeps a single shadow value-stack per block and
 ** updates it inline with the real instruction. Wasmito instead observes a
 ** running VM through `before`/`after` hooks on (groups of) opcodes: it can
 ** read the real operands/results but cannot redefine execution. This port
 ** keeps the same overall design -- a taint shadowing the real value stack,
 ** scoped per block/loop/if/function, plus taint for locals, globals and
 ** linear memory -- rebuilt on top of that coarser hook model. A handful of
 ** deliberate choices differ from the original (documented inline):
 **  - `local.tee` re-pushes the taint it just set, since (unlike the
 **    original) this port's shadow stack must always mirror the real stack's
 **    height exactly, and `tee` does not reduce it.
 **  - call arguments keep the taint they carried, instead of being reset.
 **  - a block/loop/if that completes *naturally* (its own `end` reached)
 **    propagates its left-over result taint to the enclosing scope; the
 **    original always discards it. A block exited *via a branch* still
 **    discards it (see `popScopes` below) -- resolving the exact taint of a
 **    multi-level branch's carried value is out of scope for this example.
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  Branch,
  BranchIf,
  CallInstruction,
  LoadInstruction,
  StoreInstruction,
  WasmInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from './target_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { WASM } from '../../src/webassembly/wasm';
import { WASMFunction } from '../../src/webassembly/wasm/wasm_function';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';
import { HeapUsageProbe } from '../../src/util/heap_usage_probe';

const logger = createLogger('TaintAnalysis');

/*
 * Taint sources/sinks: import functions whose *return value* should be
 * seeded as tainted, and import functions whose *argument* taint should be
 * reported when tainted. Matched by substring against the imported
 * function's name. Edit these for the module under test -- left empty by
 * default, in which case the analysis still runs as a pure propagation
 * engine (useful on its own to measure instrumentation overhead, which is
 * the original's own primary use as a benchmarking input analysis) plus the
 * always-on "tainted value stored to memory" report below.
 */
const TAINT_SOURCE_IMPORTS: string[] = [];
const TAINT_SINK_IMPORTS: string[] = [];

/*
 * Mirrors the real program state, but tracking a boolean taint label
 * instead of an actual value. One `TaintFrame` per active call; `blocks` is
 * a stack of taint arrays, one per currently open block/loop/if/function
 * body scope, each shadowing that scope's portion of the real operand
 * stack.
 */
interface TaintFrame {
  blocks: boolean[][];
  locals: (boolean | undefined)[];
  // set by `return`'s before-hook; consumed by the function's after-hook,
  // needed because an early `return` can skip the `end` of any block/loop/if
  // it returns out of (see `popScopes`), so the natural end-of-scope taint
  // is not always reliable for the return value specifically.
  pendingReturnTaint: boolean | undefined;
}

let wasm: WasmModule;
let callStack: TaintFrame[] = [];
let globalsTaint = new Map<number, boolean>();
let memoryTaint = new Map<number, boolean>();
let taintedStoreCount = 0;

function resetState(): void {
  callStack = [];
  globalsTaint = new Map();
  memoryTaint = new Map();
  taintedStoreCount = 0;
}

function report(msg: string): void {
  console.log(`[taint] ${msg}`);
}

function join(t1: boolean, t2: boolean): boolean {
  return t1 || t2;
}

function importNameMatches(name: string, patterns: string[]): boolean {
  return patterns.some((p) => name.includes(p));
}

function isImportedFuncId(id: number): boolean {
  return wasm.importFuncs.some((f) => f.id === id);
}

function currentFrame(): TaintFrame | undefined {
  return callStack[callStack.length - 1];
}

function currentBlock(): boolean[] | undefined {
  const frame = currentFrame();
  return frame?.blocks[frame.blocks.length - 1];
}

function pushTaint(t: boolean): void {
  currentBlock()?.push(t);
}

function popTaint(): boolean {
  return currentBlock()?.pop() ?? false;
}

function pushScope(): void {
  currentFrame()?.blocks.push([]);
}

/* Pops the current scope, discarding any taint left in it (e.g. a value
 * left by a `br` carrying a result out of it -- see the module doc). */
function popScope(): void {
  currentFrame()?.blocks.pop();
}

/* Pops the current scope but, unlike `popScope`, propagates its top-most
 * left-over taint (its "result", if the block/loop/if actually had one) to
 * the now-current, enclosing scope. Only correct for a scope closed by
 * reaching its own `end` naturally. */
function endScopeNaturally(): void {
  const popped = currentFrame()?.blocks.pop();
  if (popped !== undefined && popped.length > 0) {
    pushTaint(popped[popped.length - 1]);
  }
}

/* Pops up to `n` scopes, used when a branch exits one or more block/loop/if
 * constructs without ever reaching their own `end` (which is otherwise what
 * closes a scope, see `endScopeNaturally`). Always keeps the function's own
 * top-level scope in place -- that one is only ever closed by the function's
 * own after-hook. */
function popScopes(n: number): void {
  const frame = currentFrame();
  if (frame === undefined) return;
  const poppable = Math.max(0, frame.blocks.length - 1);
  for (let i = 0; i < Math.min(n, poppable); i++) popScope();
}

function localsGet(frame: TaintFrame, idx: number): boolean {
  return frame.locals[idx] ?? false;
}

function localsSet(frame: TaintFrame, idx: number, t: boolean): void {
  frame.locals[idx] = t;
}

function globalsGet(idx: number): boolean {
  return globalsTaint.get(idx) ?? false;
}

function globalsSet(idx: number, t: boolean): void {
  globalsTaint.set(idx, t);
}

function memoryGet(addr: number): boolean {
  return memoryTaint.get(addr) ?? false;
}

function memorySet(addr: number, t: boolean): void {
  if (t) memoryTaint.set(addr, true);
  else memoryTaint.delete(addr); // keep the map limited to tainted cells only
}

/* ---- values that only ever push an untainted taint ---- */

function onConst(_instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void {
  pushTaint(false);
}

function onMemorySize(
  _instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  pushTaint(false);
}

function onMemoryGrow(
  _instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  popTaint(); // requested amount, not tracked
  pushTaint(false);
}

/* ---- locals & globals ---- */

function onLocal(instr: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  const idx = instr.immediate ?? 0;
  const frame = currentFrame();
  if (instr.hasOpcode(WasmCode.LocalGet)) {
    pushTaint(frame !== undefined ? localsGet(frame, idx) : false);
  } else if (instr.hasOpcode(WasmCode.LocalSet)) {
    const t = popTaint();
    if (frame !== undefined) localsSet(frame, idx, t);
  } else if (instr.hasOpcode(WasmCode.LocalTee)) {
    const t = popTaint();
    if (frame !== undefined) localsSet(frame, idx, t);
    // `tee` leaves the value (and hence its taint) on the real stack too,
    // unlike `set` -- see the module doc.
    pushTaint(t);
  }
  void args;
}

function onGlobal(instr: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  const idx = instr.immediate ?? 0;
  if (instr.hasOpcode(WasmCode.GlobalGet)) {
    pushTaint(globalsGet(idx));
  } else if (instr.hasOpcode(WasmCode.GlobalSet)) {
    globalsSet(idx, popTaint());
  }
  void args;
}

/* ---- linear memory ---- */

function onLoad(instr: LoadInstruction, args: ReadOnlyWasmValue[]): void {
  popTaint(); // address taint, not tracked
  const effectiveAddr = Number(
    WASM.Arithmetic.add(instr.offset, args[0].value),
  );
  pushTaint(memoryGet(effectiveAddr));
}

function onStore(instr: StoreInstruction, args: ReadOnlyWasmValue[]): void {
  const valueTaint = popTaint();
  popTaint(); // address taint, not tracked
  const effectiveAddr = Number(
    WASM.Arithmetic.add(instr.offset, args[1].value),
  );
  memorySet(effectiveAddr, valueTaint);
  if (valueTaint) {
    taintedStoreCount++;
    report(
      `tainted value stored to memory[${effectiveAddr}] (function ${instr.getEnclosingFunction().id}, instr ${instr.startAddress})`,
    );
  }
}

/* ---- arithmetic ---- */

function onUnary(_instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void {
  pushTaint(popTaint());
}

function onBinary(_instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void {
  const t1 = popTaint();
  const t2 = popTaint();
  pushTaint(join(t1, t2));
}

function onDrop(_instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void {
  popTaint();
}

function onSelect(_instr: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  popTaint(); // condition taint, not tracked
  const rhsTaint = popTaint();
  const lhsTaint = popTaint();
  const condTruthy = Number(args[0].value) !== 0;
  pushTaint(condTruthy ? lhsTaint : rhsTaint);
}

/* ---- control flow: branches ---- */

function onBr(instr: Branch, _args: ReadOnlyWasmValue[]): void {
  popScopes(instr.brachTarget + 1);
}

function onBrIf(instr: BranchIf, args: ReadOnlyWasmValue[]): void {
  popTaint(); // condition taint, not tracked
  if (Number(args[0].value) !== 0) popScopes(instr.brachTarget + 1);
}

function onBrTable(_instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void {
  popTaint(); // index taint, not tracked
  // `br_table` always branches; which of its labels is taken (and thus the
  // exact depth) depends on a runtime index, so -- like the original --
  // this only closes the innermost scope rather than resolving the real
  // target depth.
  popScopes(1);
}

/* ---- control flow: block/loop/if scoping ----
 * `before` a plain Block/Loop/If opcode fires exactly once, at entry (see
 * `toInstructionHookTarget`/`structuralControlHookTarget` in
 * `analyse_instruction.ts`), which is when a new taint scope should open.
 * `after` `WasmCode.Struct.{Block,Loop,If}` is what's pinned to the
 * matching `end` instead (once, after every iteration for a Loop; after
 * whichever branch was taken for an If) -- that is when the scope should
 * close.
 */

function onBlockBefore(
  _instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  pushScope();
}

function onBlockAfter(
  _instr: WasmInstruction,
  _result: ReadOnlyWasmValue | undefined,
): void {
  endScopeNaturally();
}

function onLoopBefore(
  _instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  pushScope();
}

function onLoopAfter(
  _instr: WasmInstruction,
  _result: ReadOnlyWasmValue | undefined,
): void {
  endScopeNaturally();
}

function onIfBefore(_instr: WasmInstruction, args: ReadOnlyWasmValue[]): void {
  popTaint(); // condition taint, not tracked
  pushScope();
  void args;
}

function onIfAfter(
  _instr: WasmInstruction,
  _result: ReadOnlyWasmValue | undefined,
): void {
  endScopeNaturally();
}

/* ---- function calls ---- */

function onFuncBefore(_f: WASMFunction, args: ReadOnlyWasmValue[]): void {
  // Pop this call's argument taints off the *caller's* current scope --
  // note this happens before the new frame below is pushed, so
  // `currentFrame()` here still refers to the caller (or is `undefined` for
  // the outermost call, in which case popping is a safe no-op).
  const argTaints: boolean[] = [];
  for (let i = 0; i < args.length; i++) argTaints.unshift(popTaint());
  callStack.push({
    blocks: [[]],
    locals: argTaints,
    pendingReturnTaint: undefined,
  });
}

function onFuncAfter(
  _f: WASMFunction,
  result: ReadOnlyWasmValue | undefined,
): void {
  const frame = callStack.pop();
  if (result === undefined) return;

  let returnTaint = false;
  if (frame !== undefined) {
    if (frame.pendingReturnTaint !== undefined) {
      returnTaint = frame.pendingReturnTaint;
    } else {
      const topScope = frame.blocks[frame.blocks.length - 1];
      returnTaint = topScope?.pop() ?? false;
    }
  }
  pushTaint(returnTaint); // into the caller's (now current) scope
}

function onReturnBefore(
  instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  const frame = currentFrame();
  if (frame === undefined) return;
  if (instr.getEnclosingFunction().type.nrResults > 0) {
    frame.pendingReturnTaint = popTaint();
  }
}

/*
 * Imported functions have no body to hook `WasmCode.Struct.Func` into, so
 * `call`/`call_indirect` targeting one would otherwise leave the shadow
 * stack out of sync with the real one (an import's args are still consumed,
 * and its result -- if any -- is still pushed, on the real stack). This
 * fills that gap for direct `call`s; `call_indirect` is assumed to always
 * target a locally-defined function (the common case for a vtable-style
 * indirect call), which `WasmCode.Struct.Func` already covers correctly.
 */
function onCallBefore(instr: CallInstruction, args: ReadOnlyWasmValue[]): void {
  if (!isImportedFuncId(instr.funIdx)) return; // local target: Struct.Func handles this call
  let anyTainted = false;
  for (let i = 0; i < args.length; i++) if (popTaint()) anyTainted = true;
  if (anyTainted && importNameMatches(instr.funcName, TAINT_SINK_IMPORTS)) {
    report(
      `tainted value passed to sink import '${instr.funcName}' (instr ${instr.startAddress})`,
    );
  }
}

function onCallAfter(
  instr: CallInstruction,
  result: ReadOnlyWasmValue | undefined,
): void {
  if (!isImportedFuncId(instr.funIdx)) return;
  if (result === undefined) return;
  pushTaint(importNameMatches(instr.funcName, TAINT_SOURCE_IMPORTS));
}

function logTaintSummary(): void {
  const taintedGlobals = [...globalsTaint.values()].filter(Boolean).length;
  const taintedMemoryCells = [...memoryTaint.values()].filter(Boolean).length;
  report(
    `summary: ${taintedStoreCount} tainted store(s), ${taintedGlobals} tainted global(s), ${taintedMemoryCells} tainted memory cell(s) left`,
  );
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
  _loadSourceMap?: unknown,
  heapProbe?: HeapUsageProbe,
): Promise<BenchmarkMeasurement> {
  resetState();

  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  wasm = new WasmModule(wasmPath);
  const parseTime = logMeasurement(
    logger,
    startTimeParse,
    Date.now(),
    'Wasm Parsing',
  );

  logger.info(`spawning & connecting to WARDuino...`);
  const startTimeSpawn = Date.now();
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const spawnTime = logMeasurement(
    logger,
    startTimeSpawn,
    Date.now(),
    'Spawning VM',
  );

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();

  analysis.before(WasmCode.MultipleOpcode.Const, onConst);
  analysis.before(WasmCode.MultipleOpcode.Local, onLocal);
  analysis.before(WasmCode.MultipleOpcode.Global, onGlobal);
  analysis.before(WasmCode.MultipleOpcode.Load, onLoad);
  analysis.before(WasmCode.MultipleOpcode.Store, onStore);
  analysis.before(WasmCode.MultipleOpcode.Unary, onUnary);
  analysis.before(WasmCode.MultipleOpcode.Binary, onBinary);
  analysis.before(WasmCode.Drop, onDrop);
  analysis.before(WasmCode.Select, onSelect);

  analysis.before(WasmCode.Br, onBr);
  analysis.before(WasmCode.BrIf, onBrIf);
  analysis.before(WasmCode.BrTable, onBrTable);

  analysis.before(WasmCode.Block, onBlockBefore);
  analysis.after(WasmCode.Struct.Block, onBlockAfter);
  analysis.before(WasmCode.Loop, onLoopBefore);
  analysis.after(WasmCode.Struct.Loop, onLoopAfter);
  analysis.before(WasmCode.If, onIfBefore);
  analysis.after(WasmCode.Struct.If, onIfAfter);

  analysis.before(WasmCode.MemorySize, onMemorySize);
  analysis.before(WasmCode.MemoryGrow, onMemoryGrow);

  analysis.before(WasmCode.Return, onReturnBefore);
  analysis.before(WasmCode.Struct.Func, onFuncBefore);
  analysis.after(WasmCode.Struct.Func, onFuncAfter);
  analysis.before(WasmCode.Call, onCallBefore);
  analysis.after(WasmCode.Call, onCallAfter);

  const registerTime = logMeasurement(
    logger,
    startTimeRegister,
    Date.now(),
    'Registering Advices',
  );

  logger.info(`Deploying Hooks...`);
  if (heapProbe) await heapProbe.beforeDeploy(vmConnection);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  const deployTime = logMeasurement(
    logger,
    startTimeDeploy,
    Date.now(),
    'Deploy Hooks',
  );
  if (heapProbe) await heapProbe.afterDeploy(vmConnection);

  logger.info(`running WARDuino`);
  const analysisStartTime = Date.now();
  try {
    await analysis.run(logTaintSummary, timeouts.timeoutMsAnalysisRun);
    const analysisTime = logMeasurement(
      logger,
      analysisStartTime,
      Date.now(),
      'Analysis Completion',
    );
    return {
      wasmParsingMs: parseTime,
      vmSpawnMs: spawnTime,
      advicesRegistrationMs: registerTime,
      advicesDeploymentMs: deployTime,
      analysisRunMs: analysisTime,
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : e;
    const f: FailedMeasurement = {
      errorParsing: `${parseTime}`,
      errorSpawn: `${spawnTime}`,
      errorRegister: `${parseTime}`,
      errorDeploy: `${parseTime}`,
      errorRun: `${errMsg}`,
    };
    return f;
  }
}
