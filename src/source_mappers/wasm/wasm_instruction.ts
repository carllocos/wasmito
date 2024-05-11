import { type WASM } from '../../webassembly';
import { PlaceholderType, WasmType } from '../../webassembly/opcode_type';
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

  public startAddress?: number;
  public endAddress?: number;
  private _subInstructions: WasmInstruction[];
  private _allSubInstructions: WasmInstruction[];

  constructor(
    opcodeName: string,
    opcodeNr: number,
    immediate?: number,
    opcodeLabels?: string[],
  ) {
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

export class IfInstruction extends WasmInstruction {
  public readonly label: string;
  public readonly testInstructions: WasmInstruction[];
  public readonly alternateInstructions: WasmInstruction[];
  public readonly consequentInstructions: WasmInstruction[];
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
    this.alternateInstructions = alternate;
    this.consequentInstructions = consequent;
    this.resultType = result;
    this.subInstructions = test.concat(alternate, consequent);
  }
}

export class BlockInstruction extends WasmInstruction {
  public readonly label: string;
  constructor(blockLabel: string, subInstructions: WasmInstruction[]) {
    super('block', WASMOpcodeNumber.Block);
    this.label = blockLabel;
    this.subInstructions = subInstructions;
  }
}

export class CallInstruction extends WasmInstruction {
  public readonly funIdx: number;
  constructor(funName: string, funIdx: number) {
    super('call', WASMOpcodeNumber.Block);
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
  }
}
