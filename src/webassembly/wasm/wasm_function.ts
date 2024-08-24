import { type WasmType } from './opcode_type';
import { type WASM } from '../wasm';
import { type WasmInstruction } from './wasm_instruction';

export interface WasmLocal {
  index: number;
  type?: WASM.Type;
  name: string;
  mutable: boolean;
  value: number;
}

export class WASMFunction {
  public readonly name: string;
  public fullName: string;

  public readonly id: number;
  public readonly exported: boolean;

  public readonly type: WasmType;
  public readonly locals: WasmLocal[];

  public startAddress: number;
  public endAddress: number;
  public readonly body: WasmInstruction[];
  private readonly _allInstructions: WasmInstruction[];

  constructor(
    name: string,
    id: number,
    instructions: WasmInstruction[],
    funcType: WasmType,
    locals: WasmLocal[],
    exported: boolean,
  ) {
    this.name = name;
    this.id = id;
    this.exported = exported;
    this.type = funcType;
    this.locals = locals;
    this.body = instructions;
    this.fullName = '';
    this._allInstructions = this.getAllInstructions(instructions);
    this._allInstructions.sort((i1, i2) => i1.startAddress - i2.startAddress);

    if (this._allInstructions.length > 0) {
      this.startAddress = this._allInstructions[0].startAddress;
      this.endAddress =
        this._allInstructions[this._allInstructions.length - 1].endAddress;
    } else {
      this.startAddress = 0;
      this.endAddress = 0;
    }
  }

  get allInstructions(): WasmInstruction[] {
    return this._allInstructions;
  }

  getAllInstructions(ints: WasmInstruction[]): WasmInstruction[] {
    let allInts: WasmInstruction[] = [];

    for (const i of ints) {
      allInts.push(i);
      if (i.subInstructions.length !== 0) {
        allInts = allInts.concat(this.getAllInstructions(i.subInstructions));
      }
    }

    return allInts;
  }
}
