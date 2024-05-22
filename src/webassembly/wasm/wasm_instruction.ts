import { type WASM } from '..';
import { PlaceholderType, WasmType } from './opcode_type';
import {
  WASMOpcodeNumber,
  typeFromWasmOpcode,
  wasmOpcodeFromNr,
} from './wasm_opcode';

export class WasmInstruction {
  public readonly opcodeNr: WASMOpcodeNumber;
  public readonly name: string;
  public immediate?: number;
  private type: WasmType;
  public args: string[];

  public startAddress: number;
  public endAddress: number;
  private _subInstructions: WasmInstruction[];
  private _allSubInstructions: WasmInstruction[];

  constructor(
    opcodeName: string,
    opcodeNr: number,
    immediate?: number,
    opcodeLabels?: string[],
  ) {
    this.startAddress = 0;
    this.endAddress = 0;
    this.name = opcodeName;
    this.opcodeNr = opcodeNr;
    const op = wasmOpcodeFromNr(opcodeNr);
    if (op === undefined) {
      throw Error(`invalid opcode ${opcodeName}`);
    }
    const t = typeFromWasmOpcode(this.opcodeNr);
    if (t === undefined) {
      throw Error(`unexsting opcode type for ${opcodeName}`);
    }
    this.type = t;
    this.args = opcodeLabels ?? [];
    this.immediate = immediate;
    this._subInstructions = [];
    this._allSubInstructions = [];
  }

  get subInstructions(): WasmInstruction[] {
    return this._subInstructions;
  }

  set subInstructions(ins: WasmInstruction[]) {
    this._subInstructions = ins;
    let allSubIns: WasmInstruction[] = [];
    for (const i of this._subInstructions) {
      allSubIns.push(i);
      allSubIns = allSubIns.concat(i.allSubInstructions);
    }
    this._allSubInstructions = allSubIns;
  }

  get allSubInstructions(): WasmInstruction[] {
    return this._allSubInstructions;
  }

  public changeType(type: WasmType): void {
    if (this.type instanceof PlaceholderType) {
      this.type = new WasmType(type.nrArgs, type.nrResults, type.id);
    }
  }

  public getType(): WasmType {
    return this.type;
  }

  public getArgs(): string[] {
    return this.args;
  }
}

export function instructionToString(
  inst: WasmInstruction,
  index?: number,
): string {
  let str = `'(startAddr ${inst.startAddress}, endAddr ${inst.endAddress}) ${inst.name} ${inst.immediate} ${inst.args}'`;
  if (index !== undefined) {
    str = `idx ${index} ` + str;
  }
  return str;
}

export class BranchIf extends WasmInstruction {
  private readonly _branchTarget: number;
  constructor(branchTarget: number, opcodeLabels?: string[]) {
    super('br_if', WASMOpcodeNumber.Br_if, branchTarget, opcodeLabels);
    if (this.immediate === undefined || typeof this.immediate !== 'number') {
      throw new Error(
        `immediate on br_if should be a number given ${this.immediate}`,
      );
    }
    this._branchTarget = branchTarget;
  }

  get brachTarget(): number {
    return this._branchTarget;
  }
}

export function isBranchIf(inst: WasmInstruction): inst is BranchIf {
  return inst.opcodeNr === WASMOpcodeNumber.Br_if && inst instanceof BranchIf;
}

export class Branch extends WasmInstruction {
  private readonly _branchTarget: number;
  constructor(branchTarget: number, opcodeLabels?: string[]) {
    super('br', WASMOpcodeNumber.Br, branchTarget, opcodeLabels);
    if (this.immediate === undefined || typeof this.immediate !== 'number') {
      throw new Error(
        `immediate on br should be a number given ${this.immediate}`,
      );
    }
    this._branchTarget = branchTarget;
  }

  get brachTarget(): number {
    return this._branchTarget;
  }
}

export function isBranch(inst: WasmInstruction): inst is Branch {
  return inst.opcodeNr === WASMOpcodeNumber.Br && inst instanceof Branch;
}

export class BranchTable extends WasmInstruction {
  private readonly _branchTarget: number;
  constructor(branchTarget: number, opcodeLabels?: string[]) {
    super('br_table', WASMOpcodeNumber.Br_table, branchTarget, opcodeLabels);
    if (this.immediate === undefined || typeof this.immediate !== 'number') {
      throw new Error(
        `immediate on br_table should be a number given ${this.immediate}`,
      );
    }
    this._branchTarget = branchTarget;
  }

  get brachTarget(): number {
    return this._branchTarget;
  }
}

export function isBranchTable(inst: WasmInstruction): inst is BranchTable {
  return (
    inst.opcodeNr === WASMOpcodeNumber.Br_table && inst instanceof BranchTable
  );
}

export class ReturnBranch extends WasmInstruction {
  constructor() {
    super('return', WASMOpcodeNumber.Return);
  }
}

export function isReturnBranch(inst: WasmInstruction): inst is ReturnBranch {
  return (
    inst.opcodeNr === WASMOpcodeNumber.Return && inst instanceof ReturnBranch
  );
}

export class IfInstruction extends WasmInstruction {
  public readonly label: string;
  public readonly testInstructions: WasmInstruction[];
  public readonly alternative: WasmInstruction[];
  public readonly consequence: WasmInstruction[];
  public readonly resultType?: WASM.Type;

  constructor(
    label: string,
    test: WasmInstruction[],
    alternate: WasmInstruction[],
    consequent: WasmInstruction[],
    result?: WASM.Type,
  ) {
    super('if', WASMOpcodeNumber.If);
    this.label = label;
    this.testInstructions = test;
    this.alternative = alternate;
    this.consequence = consequent;

    if (this.consequence.length === 0) {
      throw new Error(
        `An IfInstruction should have at the very least consequence Instructions`,
      );
    }
    this.consequence.sort((i1, i2) => i1.startAddress - i2.startAddress);
    const lastConseInstr = this.consequence[this.consequence.length - 1];
    if (lastConseInstr.opcodeNr !== WASMOpcodeNumber.End) {
      throw new Error(
        `The Last instruction of the if-consequence is expected to be an 'end' instruction got ${lastConseInstr.name}'`,
      );
    }

    this.alternative.sort((i1, i2) => i1.startAddress - i2.startAddress);
    if (this.alternative.length > 0) {
      const lastAltInstr = this.alternative[this.alternative.length - 1];
      if (lastConseInstr.opcodeNr !== WASMOpcodeNumber.End) {
        throw new Error(
          `The Last instruction of the if-alternative is expected to be an 'end' instruction got ${lastAltInstr.name}'`,
        );
      }
    }

    this.resultType = result;
    this.subInstructions = test.concat(alternate, consequent);
  }

  hasAlternativeBlock(): boolean {
    return this.alternative.length > 0;
  }
}

export function isIfInstruction(inst: WasmInstruction): inst is IfInstruction {
  return inst.opcodeNr === WASMOpcodeNumber.If && inst instanceof IfInstruction;
}

export class BlockInstruction extends WasmInstruction {
  public readonly label: string;
  constructor(blockLabel: string, subInstructions: WasmInstruction[]) {
    super('block', WASMOpcodeNumber.Block);
    this.label = blockLabel;
    this.subInstructions = subInstructions;
    this.subInstructions.sort((i1, i2) => i1.startAddress - i2.startAddress);
    if (this.subInstructions.length === 0) {
      throw new Error(
        `Block instr is expected to have at least one subisntruction`,
      );
    }
    const lastInstr = this.subInstructions[this.subInstructions.length - 1];
    if (lastInstr.opcodeNr !== WASMOpcodeNumber.End) {
      throw new Error(
        `Last instruction of block instruction is expected to be an 'end' isntruction got ${lastInstr.name}'`,
      );
    }
  }
}

export class CallInstruction extends WasmInstruction {
  public readonly funIdx: number;
  constructor(funName: string, funIdx: number) {
    super('call', WASMOpcodeNumber.Call);
    this.args = [funName];
    this.funIdx = funIdx;
  }
}

export function isCallInstruction(
  inst: WasmInstruction,
): inst is CallInstruction {
  return (
    inst.opcodeNr === WASMOpcodeNumber.Call && inst instanceof CallInstruction
  );
}

export function isCallIndirect(inst: WasmInstruction): boolean {
  return inst.opcodeNr === WASMOpcodeNumber.Call_indirect;
}

export class LoopInstruction extends WasmInstruction {
  public readonly label: string;
  public readonly resultType?: string;
  constructor(
    loopLabel: string,
    subInstructions: WasmInstruction[],
    resultType?: string,
  ) {
    super('loop', WASMOpcodeNumber.Loop);
    this.label = loopLabel;
    this.subInstructions = subInstructions;
    this.resultType = resultType;
    this.subInstructions.sort((i1, i2) => i1.startAddress - i2.startAddress);

    if (this.subInstructions.length === 0) {
      throw new Error(
        `Loop instr is expected to have at least one subinstruction`,
      );
    }
    const lastInstr = this.subInstructions[this.subInstructions.length - 1];
    if (lastInstr.opcodeNr !== WASMOpcodeNumber.End) {
      throw new Error(
        `Last instruction of Loop subInstructions is expected to be an 'end' instruction got ${lastInstr.name}'`,
      );
    }
  }
}

export function isLoopInstruction(i: WasmInstruction): i is LoopInstruction {
  return i.opcodeNr === WASMOpcodeNumber.Loop && i instanceof LoopInstruction;
}

export function isControlFlowInstruction(instr: WasmInstruction): boolean {
  switch (instr.opcodeNr) {
    case WASMOpcodeNumber.Br:
    case WASMOpcodeNumber.Br_if:
    case WASMOpcodeNumber.Br_table:
    case WASMOpcodeNumber.Return:
    case WASMOpcodeNumber.Call:
    case WASMOpcodeNumber.Call_indirect:
      return true;
    default:
      return false;
  }
}

export function isBranchingInstruction(inst: WasmInstruction): boolean {
  switch (inst.opcodeNr) {
    case WASMOpcodeNumber.Br:
    case WASMOpcodeNumber.Br_if:
    case WASMOpcodeNumber.Br_table:
      return true;
    default:
      return false;
  }
}

export function isWasmInstructionBlockBased(instr: WasmInstruction): boolean {
  switch (instr.opcodeNr) {
    case WASMOpcodeNumber.Block:
    case WASMOpcodeNumber.Loop:
    case WASMOpcodeNumber.If:
      return true;
    default:
      return false;
  }
}
