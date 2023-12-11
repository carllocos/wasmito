import { type WasmType } from '../state/opcode_type';
import { readFileAsBuffer } from '../util/file_util';
import { type LineInfo, type VariableInfo } from './parsers/obj-dump_parser';
import { type WasmOpcode } from './wat/opcodes';

export interface SourceCodeLocation {
  address: number;
  lineInfo: LineInfo;
  opcode: WasmOpcode;
}

export class WASMFunction {
  public readonly name: string;
  public readonly id: number;
  public readonly opcodes: SourceCodeLocation[];

  public readonly type: WasmType;
  private smallestAddress?: number;
  private greatestAddress?: number;
  public readonly locals: VariableInfo[];

  constructor(
    name: string,
    id: number,
    opcodes: SourceCodeLocation[],
    funcType: WasmType,
    locals: VariableInfo[],
  ) {
    this.name = name;
    this.id = id;
    this.opcodes = opcodes;
    this.type = funcType;
    this.locals = locals;
    this.findSmallestAndGreatesAddress(opcodes);
  }

  private findSmallestAndGreatesAddress(
    opcodes: Array<{ address: number; opcode: WasmOpcode }>,
  ): void {
    if (opcodes.length === 0) {
      return;
    }

    let smallest = opcodes[0].address;
    let greatest = opcodes[0].address;
    for (let i = 0; i < opcodes.length; i++) {
      if (opcodes[i].address < smallest) {
        smallest = opcodes[i].address;
      }
      if (opcodes[i].address > greatest) {
        greatest = opcodes[i].address;
      }
    }

    this.smallestAddress = smallest;
    this.greatestAddress = greatest;
  }

  public getOpcode(address: number): WasmOpcode | undefined {
    if (
      this.smallestAddress === undefined ||
      this.greatestAddress === undefined ||
      address < this.smallestAddress ||
      address > this.greatestAddress
    ) {
      return undefined;
    }

    const op = this.opcodes.find((op) => {
      return op.address === address;
    });
    if (op === undefined) {
      return undefined;
    }
    return op.opcode;
  }

  public getSourceCodeLocations(): SourceCodeLocation[] {
    return this.opcodes;
  }
}

export abstract class SourceMap {
  private readonly _filepath: string;
  public readonly wasmFilePath: string;
  private wasmBuffer?: Buffer;

  constructor(filepath: string, wasmFilePath: string) {
    this._filepath = filepath;
    this.wasmFilePath = wasmFilePath;
  }

  public abstract getFunction(id: number): WASMFunction | undefined;

  public abstract opcodes(): SourceCodeLocation[];

  public getSourceCodeLocationFromAddress(
    wasmAddr: number,
  ): SourceCodeLocation | undefined {
    const location = this.opcodes().find((location: SourceCodeLocation) => {
      return location.address === wasmAddr;
    });
    return location;
  }

  public abstract getPreviousSourceCodeLocationFromAddress(
    wasmAddr: number,
  ): SourceCodeLocation | undefined;

  getWasmPath(): string {
    return this.wasmFilePath;
  }

  get sourceCodeFilePath(): string {
    return this._filepath;
  }

  async getWasm(): Promise<Buffer> {
    if (this.wasmBuffer === undefined) {
      this.wasmBuffer = await readFileAsBuffer(this.wasmFilePath);
    }
    return this.wasmBuffer;
  }

  public abstract getOpcode(address: number): WasmOpcode | undefined;

  public abstract getGlobalFromIndex(index: number): VariableInfo | undefined;
}
