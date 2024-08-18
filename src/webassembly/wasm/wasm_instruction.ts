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
  private signature: WasmType;
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
    this.signature = t;
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
    if (this.signature instanceof PlaceholderType) {
      this.signature = new WasmType(type.nrArgs, type.nrResults, type.id);
    }
  }

  public getSignature(): WasmType {
    return this.signature;
  }

  public getArgs(): string[] {
    return this.args;
  }

  public toJSONObj(): object {
    return {
      startAddress: this.startAddress,
      endAddress: this.endAddress,
      opcodeName: this.name,
      opcodeNr: this.opcodeNr,
      immediate: this.immediate ?? -1,
      subInstructions: this.subInstructions.map((i) => i.toJSONObj()),
      allSubInstructions: this.allSubInstructions.map((i) => i.toJSONObj()),
      signature: this.signature.toJSONObj(),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.toJSONObj());
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

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.branchTarget = this.brachTarget;
    return obj;
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

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.branchTarget = this.brachTarget;
    return obj;
  }
}

export function isBranch(inst: WasmInstruction): inst is Branch {
  return inst.opcodeNr === WASMOpcodeNumber.Br && inst instanceof Branch;
}

export class BranchTable extends WasmInstruction {
  private readonly _branchTargets: number[];
  constructor(branchTargets: number[]) {
    super('br_table', WASMOpcodeNumber.Br_table, undefined, undefined);
    if (branchTargets.length === 0) {
      throw new Error(
        `branch_targets of br_table should be an array of at least one number`,
      );
    } else if (
      branchTargets.find((bt) => typeof bt !== 'number') !== undefined
    ) {
      throw new Error(
        `branch_targets of br_table should be an array of only numbers`,
      );
    }
    this._branchTargets = branchTargets;
  }

  get brachTargets(): number[] {
    return this._branchTargets;
  }

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.branchTargets = this.brachTargets;
    return obj;
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
    alternative: WasmInstruction[],
    consequence: WasmInstruction[],
    resultType?: WASM.Type,
  ) {
    super('if', WASMOpcodeNumber.If);
    this.label = label;
    this.testInstructions = test;
    this.alternative = alternative;
    this.consequence = consequence;

    if (this.consequence.length === 0) {
      throw new Error(
        `An IfInstruction should have at the very least consequence Instructions`,
      );
    }
    this.consequence.sort((i1, i2) => i1.startAddress - i2.startAddress);
    const lastConseInstr = this.consequence[this.consequence.length - 1];
    const consequenceMustHaveEnd = this.alternative.length === 0;
    if (consequenceMustHaveEnd) {
      // if there is no alternative then the end instruction must be stored in the consequence block
      if (lastConseInstr.opcodeNr !== WASMOpcodeNumber.End) {
        throw new Error(
          `The Last instruction of the if-consequence is expected to be an 'end' instruction got ${lastConseInstr.name}'`,
        );
      }
    }

    this.alternative.sort((i1, i2) => i1.startAddress - i2.startAddress);
    if (this.alternative.length > 0) {
      const lastAltInstr = this.alternative[this.alternative.length - 1];
      if (lastAltInstr.opcodeNr !== WASMOpcodeNumber.End) {
        throw new Error(
          `The Last instruction of the if-alternative is expected to be an 'end' instruction got '${lastAltInstr.name}'`,
        );
      }
    }

    this.resultType = resultType;
    this.subInstructions = test.concat(alternative, consequence);
  }

  hasAlternativeBlock(): boolean {
    return this.alternative.length > 0;
  }

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.label = this.label;
    obj.test = this.testInstructions.map((i) => i.toJSONObj());
    obj.alternative = this.alternative.map((i) => i.toJSONObj());
    obj.consequence = this.consequence.map((i) => i.toJSONObj());
    obj.resultType = this.resultType ?? '';
    return obj;
  }
}

export function isIfInstruction(inst: WasmInstruction): inst is IfInstruction {
  return inst.opcodeNr === WASMOpcodeNumber.If && inst instanceof IfInstruction;
}

export class BlockInstruction extends WasmInstruction {
  public readonly label: string;
  constructor(label: string, subInstructions: WasmInstruction[]) {
    super('block', WASMOpcodeNumber.Block);
    this.label = label;
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

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.label = this.label;
    obj.subInstructions = this.subInstructions.map((i) => i.toJSONObj());
    return obj;
  }
}

export class CallInstruction extends WasmInstruction {
  public readonly funIdx: number;
  constructor(funName: string, funIdx: number) {
    super('call', WASMOpcodeNumber.Call);
    this.args = [funName];
    this.funIdx = funIdx;
  }

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.funIdx = this.funIdx;
    return obj;
  }
}

export function isCallInstruction(
  inst: WasmInstruction,
): inst is CallInstruction {
  return (
    inst.opcodeNr === WASMOpcodeNumber.Call && inst instanceof CallInstruction
  );
}

export class CallIndirect extends WasmInstruction {
  public readonly signature: WasmType;
  constructor(signature: WasmType) {
    super('callIndirect', WASMOpcodeNumber.Call_indirect);
    this.signature = signature;
  }

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.signature = this.signature;
    return obj;
  }
}

export function isCallIndirect(inst: WasmInstruction): inst is CallIndirect {
  return (
    inst.opcodeNr === WASMOpcodeNumber.Call_indirect &&
    inst instanceof CallIndirect
  );
}

export class LoopInstruction extends WasmInstruction {
  public readonly label: string;
  public readonly resultType?: WASM.Type;
  constructor(
    label: string,
    subInstructions: WasmInstruction[],
    resultType?: WASM.Type,
  ) {
    super('loop', WASMOpcodeNumber.Loop);
    this.label = label;
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

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.label = this.label;
    obj.subInstructions = this.subInstructions.map((i) => i.toJSONObj());
    obj.resultType = this.resultType ?? '';
    return obj;
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
