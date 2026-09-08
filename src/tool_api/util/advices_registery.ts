import assert from 'assert';
import { EventInspectHook } from '../../hooks/hook_event';
import { InspectStateHook } from '../../hooks/hook_inspect_state';
import { PauseVMHook } from '../../hooks/hook_run_pause';
import {
  HookOnEventContent,
  HookOnEventMoment,
  HookOnEventRequest,
} from '../../runtimes/wasmito_vm/requests/hook_on_event_request';
import {
  HookOnAddrSubContent,
  HookOnWasmAddrMoment,
  HookOnWasmAddrRequest,
} from '../../runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import { assertFatalHookError, SubscriptionContent } from '../../hooks/hook';
import { WASM, WasmState } from '../../webassembly/wasm';
import { WasmInstruction } from '../../webassembly/wasm/wasm_instruction';
import { WasmModule } from '../../webassembly/wasm/wasm_module';
import { InspectableState } from '../../runtimes/wasmito_vm/requests/inspect_request';
import { WasmitoBackendVM } from '../../runtimes/wasmito_vm/wasmito_vm';
import {
  ReadOnlyInterrupt,
  ReadOnlyWasmValue,
  WritableInterrupt,
  WritableWasmValue,
} from '../interrupts';
import { Mutex } from './mutex';

export type AdviceBefore<I extends WasmInstruction> =
  | ((
      instr: I,
      args: WritableWasmValue[],
      vm: WasmitoBackendVM,
    ) => WritableWasmValue[])
  | ((
      instr: I,
      args: WritableWasmValue[],
      vm: WasmitoBackendVM,
    ) => Promise<WritableWasmValue[]>)
  | ((instr: I, args: WritableWasmValue[]) => WritableWasmValue[])
  | ((instr: I, args: WritableWasmValue[]) => Promise<WritableWasmValue[]>)
  | ((instr: I, args: ReadOnlyWasmValue[], vm: WasmitoBackendVM) => void)
  | ((
      instr: I,
      args: ReadOnlyWasmValue[],
      vm: WasmitoBackendVM,
    ) => Promise<void>)
  | ((instr: I, args: ReadOnlyWasmValue[]) => void)
  | ((instr: I, args: ReadOnlyWasmValue[]) => Promise<void>);

export type AdviceNoArgs = (() => void) | (() => Promise<void>);
export type AdviceVMArg =
  | ((vm: WasmitoBackendVM) => void)
  | ((vm: WasmitoBackendVM) => Promise<void>);
export type AdviceAfter<I extends WasmInstruction> =
  | ((
      instr: I,
      result: WritableWasmValue | undefined,
      vm: WasmitoBackendVM,
    ) => WritableWasmValue | undefined)
  | ((
      instr: I,
      result: WritableWasmValue | undefined,
      vm: WasmitoBackendVM,
    ) => Promise<WritableWasmValue | undefined>)
  | ((
      instr: I,
      result: ReadOnlyWasmValue | undefined,
      vm: WasmitoBackendVM,
    ) => void)
  | ((
      instr: I,
      result: ReadOnlyWasmValue | undefined,
      vm: WasmitoBackendVM,
    ) => Promise<void>)
  | ((instr: I, result: ReadOnlyWasmValue | undefined) => void)
  | ((instr: I, result: ReadOnlyWasmValue | undefined) => Promise<void>)
  | ((
      instr: I,
      result: WritableWasmValue | undefined,
    ) => WritableWasmValue | undefined)
  | ((
      instr: I,
      result: WritableWasmValue | undefined,
    ) => Promise<WritableWasmValue | undefined>);

export type Advice<I extends WasmInstruction> =
  | AdviceBefore<I>
  | AdviceAfter<I>
  | AdviceNoArgs
  | AdviceVMArg;

export function isNoArgAdvice<I extends WasmInstruction>(
  advice: Advice<I> | AdviceInterrupt,
): advice is AdviceNoArgs {
  return advice.length === 0;
}

export function isVMArgAdvice<I extends WasmInstruction>(
  advice: Advice<I>,
): advice is AdviceVMArg {
  return advice.length === 1;
}

type AdviceArray = Array<[Advice<WasmInstruction>, boolean, number]>;
type AdviceMap = Map<number, AdviceArray>;

export interface InstructionHookTarget {
  hookAddr: number;
  reportAddr: number;
}

export type AdviceOnNewInterrupt =
  | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
  | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => Promise<void>)
  | ((ev: ReadOnlyInterrupt) => void)
  | ((ev: ReadOnlyInterrupt) => Promise<void>)
  | AdviceNoArgs;

export type AdviceOnNewInterruptMut =
  | ((ev: WritableInterrupt, vm: WasmitoBackendVM) => WritableInterrupt)
  | ((
      ev: WritableInterrupt,
      vm: WasmitoBackendVM,
    ) => Promise<WritableInterrupt>)
  | ((ev: WritableInterrupt) => WritableInterrupt)
  | ((ev: WritableInterrupt) => Promise<WritableInterrupt>)
  | AdviceNoArgs;

export type AdviceBeforeHandlingInterrupt =
  | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
  | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => Promise<void>)
  | ((ev: ReadOnlyInterrupt) => void)
  | ((ev: ReadOnlyInterrupt) => Promise<void>)
  | AdviceNoArgs;

export type AdviceBeforeHandlingInterruptMut =
  | ((ev: WritableInterrupt, vm: WasmitoBackendVM) => WritableInterrupt)
  | ((
      ev: WritableInterrupt,
      vm: WasmitoBackendVM,
    ) => Promise<WritableInterrupt>)
  | ((ev: WritableInterrupt) => WritableInterrupt)
  | ((ev: WritableInterrupt) => Promise<WritableInterrupt>)
  | AdviceNoArgs;

export type AdviceAfterHandlingInterrupt =
  | ((ev: ReadOnlyInterrupt) => void)
  | ((ev: ReadOnlyInterrupt) => Promise<void>)
  | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => void)
  | ((ev: ReadOnlyInterrupt, vm: WasmitoBackendVM) => Promise<void>)
  | AdviceNoArgs;

export type AdviceInterrupt =
  | AdviceOnNewInterrupt
  | AdviceOnNewInterruptMut
  | AdviceBeforeHandlingInterrupt
  | AdviceBeforeHandlingInterruptMut
  | AdviceAfterHandlingInterrupt;

type AdviceInterruptArray = Array<[AdviceInterrupt, boolean]>;

export class AdvicesRegistery {
  // for Instructions
  private _reqs: HookOnWasmAddrRequest[];
  private readonly beforeNoStack = 'beforen';
  private readonly beforeStack = 'befores';
  private readonly afterNoStack = 'aftern';
  private readonly afterStack = 'afters';
  private readonly instrBeforeState: Map<number, number>;
  private readonly instrAfterState: Map<number, number>;
  private readonly instrPauseBefore: Set<number>;
  private readonly instrPauseAfter: Set<number>;
  private readonly pauseHook: PauseVMHook; // TOFO make general
  private readonly states: Map<string, InspectStateHook<HookOnAddrSubContent>>;
  private readonly advicesBefore: AdviceMap = new Map();
  private readonly advicesAfter: AdviceMap = new Map();

  // for interrupts
  private readonly _reqsEvents: HookOnEventRequest[];
  private readonly advicesOnNewInterrupt: AdviceInterruptArray;
  private readonly advicesBeforeInterrupt: AdviceInterruptArray;
  private readonly advicesAfterInterrupt: AdviceInterruptArray;
  private readonly alreadyPaused: Set<HookOnEventMoment>;
  private readonly eventInspect: EventInspectHook<HookOnEventContent>;
  private readonly pauseVMHook: PauseVMHook;

  readonly mutexInstructions = new Mutex();
  readonly mutexInterrupts = new Mutex();

  constructor() {
    this._reqs = [];
    this.advicesBefore = new Map();
    this.advicesAfter = new Map();

    this.instrBeforeState = new Map<number, number>();
    this.instrAfterState = new Map<number, number>();
    this.instrPauseBefore = new Set<number>();
    this.instrPauseAfter = new Set<number>();
    this.pauseHook = new PauseVMHook();
    this.states = new Map([
      [
        this.beforeNoStack,
        new InspectStateHook<HookOnAddrSubContent>().includePC(),
      ],
      [
        this.beforeStack,
        new InspectStateHook<HookOnAddrSubContent>().includePC().includeStack(),
      ],
      [
        this.afterNoStack,
        new InspectStateHook<HookOnAddrSubContent>().includePC(),
      ],
      [
        this.afterStack,
        new InspectStateHook<HookOnAddrSubContent>().includePC().includeStack(),
      ],
    ]);

    // for interruptsd
    this.alreadyPaused = new Set<HookOnEventMoment>();
    this.eventInspect = new EventInspectHook<HookOnEventContent>();
    this.pauseVMHook = new PauseVMHook();
    this._reqsEvents = [];
    this.advicesOnNewInterrupt = [];
    this.advicesBeforeInterrupt = [];
    this.advicesAfterInterrupt = [];
  }

  get instructionsRequest(): HookOnWasmAddrRequest[] {
    return this._reqs;
  }

  get interruptRequests(): HookOnEventRequest[] {
    return this._reqsEvents;
  }

  getInstrStateMap(moment: HookOnWasmAddrMoment): Map<number, number> {
    switch (moment) {
      case HookOnWasmAddrMoment.HookBefore:
        return this.instrBeforeState;
      case HookOnWasmAddrMoment.HookAfter:
        return this.instrAfterState;
      default:
        throw new Error(`no instruction Map`);
    }
  }

  getPausedAddresses(moment: HookOnWasmAddrMoment): Set<number> {
    switch (moment) {
      case HookOnWasmAddrMoment.HookBefore:
        return this.instrPauseBefore;
      case HookOnWasmAddrMoment.HookAfter:
        return this.instrPauseAfter;
      default:
        throw new Error(`no instr paused set`);
    }
  }

  getInspectState(
    moment: HookOnWasmAddrMoment,
    cbArgs: number,
    i: WasmInstruction,
  ): InspectStateHook<HookOnAddrSubContent> {
    let m: string = '';
    switch (moment) {
      case HookOnWasmAddrMoment.HookBefore:
        m = i.signature.nrArgs > 0 ? this.beforeStack : this.beforeNoStack;
        break;
      case HookOnWasmAddrMoment.HookAfter:
        m = i.signature.nrResults > 0 ? this.afterStack : this.afterNoStack;
        break;
      default:
        throw new Error(`TODO case around`);
    }

    const h = this.states.get(m);
    assert(h !== undefined, `fail to find InspectStateHook for ${m}`);
    return h;
  }

  registerAdviceInstructionCallback(
    cb: (
      sub: SubscriptionContent<HookOnAddrSubContent, WasmState>,
    ) => Promise<void>,
  ): void {
    this.states.get(this.beforeNoStack)!.subscribe(cb);
    this.states.get(this.beforeStack)!.subscribe(cb);
    this.states.get(this.afterNoStack)!.subscribe(cb);
    this.states.get(this.afterStack)!.subscribe(cb);
  }

  registerAdviceInterruptCallback(
    cb:
      | ((data: SubscriptionContent<HookOnEventContent, WASM.Event>) => void)
      | ((data: SubscriptionContent<HookOnEventContent, WASM.Event>) => void),
  ): void {
    this.eventInspect.subscribe(cb);
  }

  getInterruptAdvices(moment: HookOnEventMoment): AdviceInterruptArray {
    switch (moment) {
      case HookOnEventMoment.onNewEvent:
        return this.advicesOnNewInterrupt;
      case HookOnEventMoment.beforeEventHandled:
        return this.advicesBeforeInterrupt;
      case HookOnEventMoment.afterEventHandled:
        return this.advicesAfterInterrupt;
      default:
        throw new Error(`invalid hook moment: ${moment}`);
    }
  }

  addOnEventRequest(req: HookOnEventRequest): number {
    return this._reqsEvents.push(req);
  }

  addInterruptAdvice(
    m: HookOnEventMoment,
    mutate: boolean,
    cb: AdviceInterrupt,
  ): number {
    const ads = this.getInterruptAdvices(m);
    const sizeBefore = ads.length;
    if (sizeBefore === 0) {
      const r = new HookOnEventRequest(m).addHook(this.eventInspect);
      this._reqsEvents.push(r);
    }

    if (mutate && !this.alreadyPaused.has(m)) {
      const r = new HookOnEventRequest(m).addHook(this.pauseVMHook);
      this._reqsEvents.push(r);
      this.alreadyPaused.add(m);
    }

    const sizeAfter = ads.push([cb, mutate]);
    return sizeAfter - sizeBefore;
  }

  addInstructionsAdvice(
    hm: HookOnWasmAddrMoment,
    instrs: InstructionHookTarget[],
    mutate: boolean,
    cb: (...args: any[]) => any,
    wasm: WasmModule,
  ) {
    if (instrs.length === 0) return 0;

    const sm = this.getInstrStateMap(hm);
    let advicesRegistered = 0;
    for (const { hookAddr, reportAddr } of instrs) {
      let stateIdx = sm.get(hookAddr);
      let req: HookOnWasmAddrRequest | undefined;
      if (stateIdx !== undefined) {
        req = this._reqs[stateIdx];
      } else {
        req = new HookOnWasmAddrRequest(hookAddr, hm);
        stateIdx = this._reqs.push(req) - 1;
        sm.set(hookAddr, stateIdx);
      }

      const reportInstr = wasm.getInstruction(reportAddr);
      assert(
        reportInstr !== undefined,
        `no instruction found for report address ${reportAddr}`,
      );
      const state = this.getInspectState(hm, cb.length, reportInstr);
      if (
        req.hook === undefined ||
        state.doesInclude(InspectableState.stackState)
      ) {
        req.hook = state;
      }

      if (mutate) {
        const pausedAddresses = this.getPausedAddresses(hm);
        if (!pausedAddresses.has(hookAddr)) {
          const pauseReq = new HookOnWasmAddrRequest(hookAddr, hm).addHook(
            this.pauseHook,
          );
          this._reqs.push(pauseReq);
          pausedAddresses.add(hookAddr);
        }
      }
      advicesRegistered += this.storeInstructionAdvice(
        hm,
        hookAddr,
        cb,
        mutate,
        reportAddr,
      );
    }
    return advicesRegistered;
  }

  storeInstructionAdvice(
    moment: HookOnWasmAddrMoment,
    addr: number,
    cb: Advice<WasmInstruction>,
    mutable: boolean,
    reportAddr: number,
  ): number {
    let advices: AdviceMap | undefined;
    switch (moment) {
      case HookOnWasmAddrMoment.HookBefore: {
        advices = this.advicesBefore;
        break;
      }
      case HookOnWasmAddrMoment.HookAfter: {
        advices = this.advicesAfter;
        break;
      }
      default:
        throw new Error(`TODO`);
    }

    const ads = advices.get(addr) ?? [];
    const sizeBefore = ads.length;
    const entry: [Advice<WasmInstruction>, boolean, number] = [
      cb,
      mutable,
      reportAddr,
    ];
    if (reportAddr !== addr) {
      let insertIdx = 0;
      while (insertIdx < ads.length && ads[insertIdx][2] !== addr) {
        insertIdx++;
      }
      ads.splice(insertIdx, 0, entry);
    } else {
      ads.push(entry);
    }
    advices.set(addr, ads);
    return ads.length - sizeBefore;
  }

  getAdvices(moment: HookOnWasmAddrMoment, addr: number): AdviceArray {
    let m: AdviceMap | undefined;
    switch (moment) {
      case HookOnWasmAddrMoment.HookBefore:
        m = this.advicesBefore;
        break;
      case HookOnWasmAddrMoment.HookAfter:
        m = this.advicesAfter;
        break;
      default:
        throw new Error('no moment advices');
    }
    const advices = m.get(addr);
    assertFatalHookError(
      advices !== undefined && advices.length > 0,
      `no ${moment} advices registed on addr ${addr}`,
    );
    return advices;
  }
}
