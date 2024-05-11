import { type WasmType } from '../opcode_type';
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
  ) {
    this.name = name;
    this.id = id;
    this.type = funcType;
    this.locals = locals;
    this.startAddress = 0;
    this.endAddress = 0;
    this.body = instructions;
    this.findSmallestAndGreatesAddress(instructions);
    this.fullName = '';

    this._allInstructions = this.body.flatMap((i) =>
      [i].concat(i.subInstructions),
    );
  }

  get allInstructions(): WasmInstruction[] {
    return this._allInstructions;
  }

  private findSmallestAndGreatesAddress(instructions: WasmInstruction[]): void {
    if (instructions.length === 0) {
      return;
    }
    let smallest = instructions[0].startAddress;
    let greatest = instructions[0].startAddress;
    if (smallest === undefined || greatest === undefined) {
      throw new Error(`Instruction is missing startAddress`);
    }
    for (let i = 0; i < instructions.length; i++) {
      const sa = instructions[i].startAddress;
      if (sa === undefined) {
        throw new Error(`Instruction is missing startAddress`);
      }
      if (smallest === undefined) {
        throw new Error(`Instruction is missing startAddress`);
      }
      if (greatest === undefined) {
        throw new Error(`Instruction is missing startAddress`);
      }
      if (sa < smallest) {
        smallest = sa;
      }
      if (sa > greatest) {
        greatest = sa;
      }
    }
    this.startAddress = smallest;
    this.endAddress = greatest;
  }
}
