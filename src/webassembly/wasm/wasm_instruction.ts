import { WASM } from '../wasm';
import { PlaceholderType, WasmType } from './opcode_type';
import {
  WasmOpcodeBlock,
  WasmOpcodeBr,
  WasmOpcodeBrIf,
  WasmOpcodeBrTable,
  WasmOpcodeCall,
  WasmOpcodeCallIndirect,
  WasmOpcodeF32Const,
  WasmOpcodeF64Const,
  WasmOpcodeI32Const,
  WasmOpcodeI64Const,
  WasmOpcodeIf,
  WasmOpcodeLoop,
  WasmOpcodeReturn,
  WasmOpcode,
  getWasmOpcodeNr,
  getOpcodeName,
  getOpcodeType,
  WasmCode,
  equalOpcodes,
} from './wasm_opcode';

export type WasmAddress = number;

export class WasmInstruction {
  public readonly opcode: WasmOpcode;
  public readonly name: string;
  public immediate?: number;
  private _signature: WasmType;
  public args: string[];

  public startAddress: number;
  public endAddress: number;
  private _subInstructions: WasmInstruction[];
  private _allSubInstructions: WasmInstruction[];

  constructor(
    opcode: WasmOpcode,
    immediate?: number,
    opcodeLabels?: string[],
    signature?: WasmType,
  ) {
    this.startAddress = 0;
    this.endAddress = 0;
    this.opcode = opcode;
    this.name = getOpcodeName(opcode);
    const t = signature ?? getOpcodeType(opcode);
    if (t === undefined) {
      throw Error(`inexistent opcode type for ${this.name}`);
    }
    this._signature = t;
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

  get signature(): WasmType {
    return this._signature;
  }

  set signature(type: WasmType) {
    if (this._signature instanceof PlaceholderType) {
      this._signature = new WasmType(type.nrArgs, type.nrResults, type.id);
    }
  }

  hasOpcode(opcode: WasmOpcode): boolean {
    return equalOpcodes(this.opcode, opcode);
  }

  public getArgs(): string[] {
    return this.args;
  }

  public toJSONObj(): object {
    return {
      startAddress: this.startAddress,
      endAddress: this.endAddress,
      opcodeName: this.name,
      opcodeNr: getWasmOpcodeNr(this.opcode),
      immediate: this.immediate ?? -1,
      subInstructions: this.subInstructions.map((i) => i.toJSONObj()),
      allSubInstructions: this.allSubInstructions.map((i) => i.toJSONObj()),
      signature: this._signature.toJSONObj(),
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
    super(WasmCode.BrIf, branchTarget, opcodeLabels);
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
  return equalOpcodes(inst.opcode, WasmCode.BrIf) && inst instanceof BranchIf;
}

export class Branch extends WasmInstruction {
  private readonly _branchTarget: number;
  constructor(branchTarget: number, opcodeLabels?: string[]) {
    super(WasmCode.Br, branchTarget, opcodeLabels);
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
  return equalOpcodes(inst.opcode, WasmCode.Br) && inst instanceof Branch;
}

export class BranchTable extends WasmInstruction {
  private readonly _branchTargets: number[];
  constructor(branchTargets: number[]) {
    super(WasmCode.BrTable, undefined, undefined);
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
    equalOpcodes(inst.opcode, WasmCode.BrTable) && inst instanceof BranchTable
  );
}

export class ReturnBranch extends WasmInstruction {
  constructor() {
    super(WasmCode.Return, WasmOpcodeReturn);
  }
}

export function isReturnBranch(inst: WasmInstruction): inst is ReturnBranch {
  return (
    equalOpcodes(inst.opcode, WasmCode.Return) && inst instanceof ReturnBranch
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
    super(WasmCode.If);
    this.label = label;
    this.testInstructions = test;
    this.alternative = alternative;
    this.consequence = consequence;

    if (this.consequence.length === 0 && this.alternative.length === 0) {
      throw new Error(
        `An IfInstruction should have at the very least consequence Instructions`,
      );
    }
    this.consequence.sort((i1, i2) => i1.startAddress - i2.startAddress);
    const lastConseInstr = this.consequence[this.consequence.length - 1];
    const consequenceMustHaveEnd = this.alternative.length === 0;
    if (consequenceMustHaveEnd) {
      // if there is no alternative then the end instruction must be stored in the consequence block
      if (!equalOpcodes(lastConseInstr.opcode, WasmCode.End)) {
        throw new Error(
          `The Last instruction of the if-consequence is expected to be an 'end' instruction got ${lastConseInstr.name}'`,
        );
      }
    }

    this.alternative.sort((i1, i2) => i1.startAddress - i2.startAddress);
    if (this.alternative.length > 0) {
      const lastAltInstr = this.alternative[this.alternative.length - 1];
      if (!equalOpcodes(lastAltInstr.opcode, WasmCode.End)) {
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
  return (
    equalOpcodes(inst.opcode, WasmCode.If) && inst instanceof IfInstruction
  );
}

export class BlockInstruction extends WasmInstruction {
  public readonly label: string;
  constructor(label: string, subInstructions: WasmInstruction[]) {
    super(WasmCode.Block, WasmOpcodeBlock);
    this.label = label;
    this.subInstructions = subInstructions;
    this.subInstructions.sort((i1, i2) => i1.startAddress - i2.startAddress);
    if (this.subInstructions.length === 0) {
      throw new Error(
        `Block instr is expected to have at least one subisntruction`,
      );
    }
    const lastInstr = this.subInstructions[this.subInstructions.length - 1];
    if (!equalOpcodes(lastInstr.opcode, WasmCode.End)) {
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
  public readonly funcName: string;

  constructor(funName: string, funIdx: number) {
    super(WasmCode.Call);
    this.args = [funName];
    this.funIdx = funIdx;
    this.funcName = funName;
  }

  get calledFunc(): number {
    return this.funIdx;
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
    equalOpcodes(inst.opcode, WasmCode.Call) && inst instanceof CallInstruction
  );
}

export class CallIndirect extends WasmInstruction {
  private _targetFuncs: number[];
  private _tblIndex: number;

  constructor(signature: WasmType) {
    super(WasmCode.CallIndirect, undefined, undefined, signature);
    this._targetFuncs = [];
    this._tblIndex = -1;
  }

  get targetFuncs(): number[] {
    return this._targetFuncs;
  }

  set targetFuncs(nt: number[]) {
    this._targetFuncs = nt;
  }

  get tableIndex(): number {
    return this._tblIndex;
  }

  set tableIndex(i: number) {
    this._tblIndex = i;
  }

  hasTableIndex(): boolean {
    return this._tblIndex > -1;
  }

  public toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.targetFuncs = this.targetFuncs;
    obj.tableIndex = this.tableIndex;
    return obj;
  }
}

export function isCallIndirect(inst: WasmInstruction): inst is CallIndirect {
  return (
    equalOpcodes(inst.opcode, WasmCode.CallIndirect) &&
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
    super(WasmCode.Loop);
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
    if (!equalOpcodes(lastInstr.opcode, WasmCode.End)) {
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
  return equalOpcodes(i.opcode, WasmCode.Loop) && i instanceof LoopInstruction;
}

export function isControlFlowInstruction(instr: WasmInstruction): boolean {
  switch (getWasmOpcodeNr(instr.opcode)) {
    case WasmOpcodeBr:
    case WasmOpcodeBrIf:
    case WasmOpcodeBrTable:
    case WasmOpcodeReturn:
    case WasmOpcodeCall:
    case WasmOpcodeCallIndirect:
      return true;
    default:
      return false;
  }
}

export function isBranchingInstruction(instr: WasmInstruction): boolean {
  switch (getWasmOpcodeNr(instr.opcode)) {
    case WasmOpcodeBr:
    case WasmOpcodeBrIf:
    case WasmOpcodeBrTable:
      return true;
    default:
      return false;
  }
}

export function isWasmInstructionBlockBased(instr: WasmInstruction): boolean {
  switch (getWasmOpcodeNr(instr.opcode)) {
    case WasmOpcodeBlock:
    case WasmOpcodeLoop:
    case WasmOpcodeIf:
      return true;
    default:
      return false;
  }
}

export class ConstInstr extends WasmInstruction {
  public readonly type: WASM.Type;
  public readonly value: number;
  private readonly _high: number;

  /**
   * high is only used in combination with a I64Const
   * and denotes the high bit of a 64bit numbers as explained in
   * https://www.npmjs.com/package/@xtuc/long/v/4.2.2
   * it is needed because JS can only handle 54bit numbers
   */
  constructor(opcode: WasmOpcode, value: number, high?: number) {
    super(opcode);
    this.type = wasmTypefromConstOpcode(opcode);
    this.value = value;
    this._high = high ?? -1;
  }

  public override toJSONObj(): object {
    const obj: any = super.toJSONObj();
    obj.type = this.type;
    obj.value = this.value;
    obj.high = this._high;
    return obj;
  }
}

export class I32ConstInstruction extends ConstInstr {
  constructor(value: number) {
    super(WasmCode.I32Const, value);
  }
}

export class F32ConstInstruction extends ConstInstr {
  constructor(value: number) {
    super(WasmCode.F32Const, value);
  }
}

export class I64ConstInstruction extends ConstInstr {
  constructor(value: number, high?: number) {
    super(WasmCode.I64Const, value, high);
  }
}

export class F64ConstInstruction extends ConstInstr {
  constructor(value: number) {
    super(WasmCode.F64Const, value);
  }
}

function wasmTypefromConstOpcode(opcode: WasmOpcode): WASM.Type {
  switch (getWasmOpcodeNr(opcode)) {
    case WasmOpcodeI32Const:
      return WASM.Type.i32;
    case WasmOpcodeF32Const:
      return WASM.Type.f32;
    case WasmOpcodeI64Const:
      return WASM.Type.i64;
    case WasmOpcodeF64Const:
      return WASM.Type.f64;
    default:
      throw new Error(
        `Opcode ${opcode} is not a const and cannot produce wasm type`,
      );
  }
}

export function isConst(instr: WasmInstruction): instr is ConstInstr {
  if (instr instanceof ConstInstr) {
    switch (getWasmOpcodeNr(instr.opcode)) {
      case WasmOpcodeI32Const:
      case WasmOpcodeI64Const:
      case WasmOpcodeF32Const:
      case WasmOpcodeF64Const:
        return true;
      default:
        return false;
    }
  }
  return false;
}

export function isTableSet(instr: WasmInstruction): boolean {
  return equalOpcodes(instr.opcode, WasmCode.TableSet);
}

export class GlobalGetInstruction extends WasmInstruction {
  private _idx: number;
  constructor(idx: number) {
    super(WasmCode.GlobalGet, idx);
    this._idx = idx;
  }

  get index(): number {
    return this._idx;
  }
}

export class GlobalSetInstruction extends WasmInstruction {
  private _idx: number;
  constructor(idx: number) {
    super(WasmCode.GlobalSet, idx);
    this._idx = idx;
  }

  get index(): number {
    return this._idx;
  }
}

export class LoadInstruction extends WasmInstruction {
  readonly offset: number;

  constructor(opcode: WasmOpcode, offset: number) {
    super(opcode);
    this.offset = offset;
  }
}

export function isLoadInstruction(i: any): i is LoadInstruction {
  return i instanceof LoadInstruction;
}

export class StoreInstruction extends WasmInstruction {
  readonly offset: number;

  constructor(opcode: WasmOpcode, offset: number) {
    super(opcode);
    this.offset = offset;
  }
}
