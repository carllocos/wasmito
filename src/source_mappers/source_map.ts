import { type WasmType } from '../state/opcode_type';
import { getFileName, readFileAsBuffer } from '../util/file_util';
import { type VariableInfo } from './parsers/obj-dump_parser';
import { type WasmOpcode } from './wat/opcodes';

export interface SourceCodeMapping {
  address: number;
  linenr: number;
  columnStart: number;
  columnEnd: number;
  opcode: WasmOpcode;
}

export interface SourceCodeLocation {
  linenr: number;
  columnStart?: number;
  columnEnd?: number;
}

export class WASMFunction {
  public readonly name: string;
  public readonly id: number;
  public readonly mappings: SourceCodeMapping[];

  public readonly type: WasmType;
  private smallestAddress?: number;
  private greatestAddress?: number;
  public readonly locals: VariableInfo[];

  constructor(
    name: string,
    id: number,
    opcodes: SourceCodeMapping[],
    funcType: WasmType,
    locals: VariableInfo[],
  ) {
    this.name = name;
    this.id = id;
    this.mappings = opcodes;
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

    const op = this.mappings.find((op) => {
      return op.address === address;
    });
    if (op === undefined) {
      return undefined;
    }
    return op.opcode;
  }

  public getSourceCodeLocations(): SourceCodeMapping[] {
    return this.mappings;
  }
}

export abstract class SourceMap {
  private readonly _filepath: string;
  private readonly _filename: string;
  public readonly wasmFilePath: string;
  private wasmBuffer?: Buffer;

  constructor(filepath: string, wasmFilePath: string) {
    this._filepath = filepath;
    this._filename = getFileName(filepath);
    this.wasmFilePath = wasmFilePath;
  }

  public abstract getFunction(id: number): WASMFunction | undefined;

  public abstract mappings(): SourceCodeMapping[];

  public getSourceCodeMappingFromAddress(
    wasmAddr: number,
  ): SourceCodeMapping | undefined {
    const location = this.mappings().find((location: SourceCodeMapping) => {
      return location.address === wasmAddr;
    });
    return location;
  }

  public abstract getPrevSourceCodeMappingFromAddress(
    wasmAddr: number,
  ): SourceCodeMapping | undefined;

  getWasmPath(): string {
    return this.wasmFilePath;
  }

  get sourceCodeFilePath(): string {
    return this._filepath;
  }

  get sourceCodeFileName(): string {
    return this._filename;
  }

  async getWasm(): Promise<Buffer> {
    if (this.wasmBuffer === undefined) {
      this.wasmBuffer = await readFileAsBuffer(this.wasmFilePath);
    }
    return this.wasmBuffer;
  }

  public abstract getOpcode(address: number): WasmOpcode | undefined;

  public abstract getGlobalFromIndex(index: number): VariableInfo | undefined;

  public getMappingsFromSourceCodeLocation(
    location: SourceCodeLocation,
  ): SourceCodeMapping[] {
    return this.mappings().filter((mapping: SourceCodeMapping) => {
      if (mapping.linenr === location.linenr) {
        let equalStart = true;
        if (location.columnStart !== undefined) {
          equalStart = mapping.columnStart <= location.columnStart;
        }

        let equalEnd = true;
        if (location.columnEnd !== undefined) {
          equalEnd = mapping.columnEnd >= location.columnEnd;
        }
        return equalStart && equalEnd;
      }
      return false;
    });
  }
}
