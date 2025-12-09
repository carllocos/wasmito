import assert from 'assert';
import { Hook } from '../hooks/hook';
import { HookOnWasmAddrMoment } from '../runtimes/wasmito_vm/requests/hook_on_wasm_addr_request';
import { WasmState } from '../webassembly';
import { WasmInstruction } from '../webassembly/wasm/wasm_instruction';

export enum WasmMode {
  Before = 'before',
  After = 'after',
  Around = 'around',
}

export type InstrMoment =
  | 'before'
  | 'after'
  | 'around'
  | 'onNewInterrupt'
  | 'beforeInterruptHandled'
  | 'afterHandlingInterrupt';

export function getMode(m: InstrMoment): HookOnWasmAddrMoment {
  switch (m) {
    case 'before':
      return HookOnWasmAddrMoment.HookBefore;
    case 'after':
      return HookOnWasmAddrMoment.HookAfter;
    case 'around':
      return HookOnWasmAddrMoment.HookAround;
    default:
      throw new Error(`provided invalid instruction moment ${m}`);
  }
}

function isInstructionMoment(m: InstrMoment): boolean {
  switch (m) {
    case 'before':
    case 'after':
    case 'around':
      return true;
    default:
      return false;
  }
}

export class GroupHooks {
  private _mode: InstrMoment;
  private _deployed: boolean;
  private listener: ((s: WasmState) => void) | undefined;
  private instructionActions: Map<WasmInstruction, Hook[]>;
  private interruptActions: Hook[];

  constructor(mode: InstrMoment, listener?: (s: WasmState) => void) {
    this._mode = mode;
    this._deployed = false;
    this.listener = listener;
    this.instructionActions = new Map();
    this.interruptActions = [];
  }

  get actions(): Hook[] {
    if (isInstructionMoment(this._mode)) {
      const acts: Hook[] = [];
      for (const a of this.instructionActions.values()) {
        acts.push(...a);
      }
      return acts;
    } else {
      return this.interruptActions;
    }
  }

  get instructions(): WasmInstruction[] {
    return Array.from(this.instructionActions.keys());
  }

  addInstructionActions(i: WasmInstruction, actions: Hook[]): void {
    const acts = this.instructionActions.get(i) ?? [];
    acts.push(...actions);
    this.instructionActions.set(i, acts);
  }

  getInstructionActions(i: WasmInstruction): Hook[] {
    return this.instructionActions.get(i) ?? [];
  }

  get deployed(): boolean {
    return this._deployed;
  }

  set deployed(d: true) {
    this._deployed = d;
  }

  get mode(): InstrMoment {
    return this._mode;
  }

  addInterruptAction(a: Hook): void {
    this.interruptActions.push(a);
  }

  get internalInstructionMode(): HookOnWasmAddrMoment {
    assert(isInstructionMoment(this._mode), 'mode was not set for instruction');
    return getMode(this._mode);
  }

  get internalInterruptMode(): number {
    assert(!isInstructionMoment(this._mode), 'mode was not set for interrupt');
    return 0;
  }

  subscribe(cb: (s: WasmState) => void): void {
    this.listener = cb;
  }

  subscription(): (s: WasmState) => void {
    assert(this.listener !== undefined);
    return this.listener;
  }
}
