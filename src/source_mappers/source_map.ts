import { type WasmType } from '../state/opcode_type';
import {
  getAbsolutePath,
  getFileName,
  isAbsolutePath,
  readFileAsBuffer,
} from '../util/file_util';
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
  private readonly _sources: string[];
  private readonly _filenames: string[];
  public readonly wasmFilePath: string;
  private wasmBuffer?: Buffer;

  constructor(sources: string[], wasmFilePath: string) {
    this._sources = sources.map(getAbsolutePath);
    this._sources.forEach((s) => {
      if (!isAbsolutePath(s)) {
        throw new Error(`source '${s}' is expected to be an absolute path`);
      }
    });
    this._filenames = this._sources.map(getFileName);
    this.wasmFilePath = wasmFilePath;
  }

  public abstract getSources(): string[];

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

  get sources(): string[] {
    return this._sources;
  }

  get sourceCodeFilePath(): string {
    // TODO remove
    return this.sources[0];
  }

  get sourceCodeFileName(): string {
    // TODO remove
    return this.sources[0];
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

  public abstract getEnvironmentFunctions(): WASMFunction[];
}
