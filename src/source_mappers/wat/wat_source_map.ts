import { type WasmType } from '../../state/opcode_type';
import { type LineInfo, type VariableInfo } from '../parsers/obj-dump_parser';
import { SourceMap, type WASMFunction } from '../source_map';
import { type WasmOpcode } from './opcodes';

export class WATSourceMap extends SourceMap {
  public readonly functions: WASMFunction[];
  public readonly imports: WASMFunction[];
  public readonly globals: VariableInfo[];

  constructor(
    sourcePath: string,
    wasmPath: string,
    types: WasmType[],
    globals: VariableInfo[],
    functions: WASMFunction[],
    imported: WASMFunction[],
  ) {
    super(sourcePath, wasmPath);
    this.functions = functions;
    this.imports = imported;
    this.globals = globals;
  }

  public getFunction(id: number): WASMFunction | undefined {
    if (id > this.imports.length) {
      return this.functions.find((f) => {
        return f.id === id;
      });
    } else {
      return this.imports.find((f) => {
        return f.id === id;
      });
    }
  }

  public opcodes(): Array<{
    address: number;
    lineInfo: LineInfo;
    opcode: WasmOpcode;
  }> {
    let opcodes: Array<{
      address: number;
      lineInfo: LineInfo;
      opcode: WasmOpcode;
    }> = [];
    for (const func of this.functions) {
      opcodes = opcodes.concat(func.opcodes);
    }
    return opcodes;
  }

  public getOpcode(address: number): WasmOpcode | undefined {
    for (const fun of this.functions) {
      const opcode = fun.getOpcode(address);
      if (opcode !== undefined) {
        return opcode;
      }
    }
    return undefined;
  }
}
