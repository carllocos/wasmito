import { type WasmType } from '../../state/opcode_type';
import { type VariableInfo } from '../parsers/obj-dump_parser';
import {
  type SourceCodeMapping,
  SourceMap,
  type WASMFunction,
} from '../source_map';
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
    if (id >= this.imports.length) {
      return this.functions.find((f) => {
        return f.id === id;
      });
    } else {
      return this.imports.find((f) => {
        return f.id === id;
      });
    }
  }

  public getEnvironmentFunctions(): WASMFunction[] {
    return this.imports;
  }

  public getGlobalFromIndex(index: number): VariableInfo | undefined {
    return this.globals.find((gb) => gb.index === index);
  }

  public mappings(): SourceCodeMapping[] {
    let opcodes: SourceCodeMapping[] = [];
    for (const func of this.functions) {
      opcodes = opcodes.concat(func.mappings);
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

  public getPrevSourceCodeMappingFromAddress(
    wasmAddr: number,
  ): SourceCodeMapping | undefined {
    const func = this.functions.find((func: WASMFunction) => {
      return func.getOpcode(wasmAddr);
    });

    if (func === undefined) {
      return undefined;
    }

    const locations = func.getSourceCodeLocations();
    let idxPrevLocation = -1;
    for (let index = 0; index < locations.length; index++) {
      const location = locations[index];
      if (location.address === wasmAddr) {
        idxPrevLocation = index - 1;
        break;
      }
    }

    if (idxPrevLocation < 0) {
      return undefined;
    }
    return locations[idxPrevLocation];
  }
}
