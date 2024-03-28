import { createLogger } from '../../logger/logger';
import { WasmType } from '../../state/opcode_type';
import { WASM } from '../../state/wasm';
import { WASMFunction, type WasmLocal } from './wasm_function';
import {
  type ParsedModule,
  parseWasmModule,
  type Section,
} from './wasm_module_parser';
import { execSync } from 'child_process';
import {
  type VariableInfo,
  getGlobalInfos,
  getLocalTypesFromDissambleOutput,
} from '../parsers/obj-dump_parser';
import { getPath2ObjDump } from '../../project_config';
import { isCallInstruction, type WasmInstruction } from './wasm_instruction';

const logger = createLogger('WasmModule');
export interface WasmGlobal {
  index: number;
  type: WASM.Type;
  name: string;
  mutable: boolean;
  startAddress: number;
  endAddress: number;
  value: number; // might not be needed
}

export class WasmModule {
  public readonly wasmPath: string;

  public readonly types: WasmType[];
  public readonly imports: WASMFunction[];
  public readonly globals: WasmGlobal[];
  public readonly functions: WASMFunction[];
  private readonly ast: object;
  public readonly wasmBuffer: Buffer;
  private readonly _instructions: WasmInstruction[];
  private readonly _globalInstructions: WasmInstruction[];
  private readonly _sections: Section[];

  constructor(wasmPath: string) {
    const mod: ParsedModule = parseWasmModule(wasmPath);
    this.wasmPath = wasmPath;
    this._sections = createSections(mod);
    this.functions = createWasmFunctions(wasmPath, mod);
    this.imports = createImportedFunctions(mod);
    this.globals = createWasmGlobals(wasmPath, mod);
    this.types = createWasmTypes(mod);
    this.ast = mod.ast;
    this.wasmBuffer = mod.wasmBuffer;
    this._globalInstructions = retrieveGlobalInstructions(mod);
    this._instructions = retrieveAllInstructions(mod, this.functions);
    this.correctCallInstructionsTypes();
  }

  get instructions(): WasmInstruction[] {
    return this._instructions;
  }

  get locals(): WasmLocal[] {
    return this.functions.flatMap((f) => {
      return f.locals;
    });
  }

  sectionFromAddress(addr: number): Section | undefined {
    return this._sections.find((s) => {
      return s.startAddress <= addr && addr <= s.endAddress;
    });
  }

  instructionFromAddress(addr: number): WasmInstruction | undefined {
    const sect = this.sectionFromAddress(addr);
    if (sect !== undefined) {
      // addr points to section which has no instruction
      return undefined;
    }

    // addr may point to a global declaration instruction
    const globalInstruction = this._globalInstructions.find((i) => {
      const sa = i.startAddress;
      const ea = i.endAddress;
      if (sa === undefined || ea === undefined) {
        throw new Error('undefined start or end address');
      }
      return sa <= addr && addr <= ea;
    });

    if (globalInstruction !== undefined) {
      return globalInstruction;
    }

    // addr is in a function body
    for (let i = 0; i < this.functions.length; i++) {
      const fun = this.functions[i];
      if (fun.startAddress <= addr && addr <= fun.endAddress) {
        for (const inst of fun.body) {
          if (inst.startAddress === addr) {
            return inst;
          } else {
            if (inst.endAddress === undefined) {
              throw new Error(`No endAddress provided for ${inst.getLabels}`);
            }

            if (addr < inst.endAddress) {
              return inst.subInstructions.find((subInst) => {
                return subInst.startAddress === addr;
              });
            }
          }
        }
      }
    }
    return undefined;
  }

  public getGlobalFromIndex(index: number): WasmGlobal | undefined {
    return this.globals.find((g) => {
      return g.index === index;
    });
  }

  public getGlobalFromAddress(addr: number): WasmGlobal | undefined {
    return this.globals.find(
      (g) => g.startAddress <= addr && addr <= g.endAddress,
    );
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

  private correctCallInstructionsTypes(): void {
    this.instructions.forEach((i: WasmInstruction) => {
      if (isCallInstruction(i)) {
        const fun = this.functions.find((f) => f.id === i.funIdx);
        if (fun === undefined) {
          throw new Error(`Fun not found with id ${i.funIdx}`);
        }
        i.changeType(fun.type);
      }
    });
  }
}

function createWasmTypes(mod: ParsedModule): WasmType[] {
  return mod.types;
}

function createWasmGlobals(wasmPath: string, mod: ParsedModule): WasmGlobal[] {
  const names = getGlobalNames(wasmPath);
  return mod.globals.map((g, globalID) => {
    const t = WASM.typing.get(g.globalType.valtype);
    if (t === undefined) {
      throw new Error(`Could not convert ${g.globalType.valtype} to WASM type`);
    }
    return {
      index: globalID,
      name: g.name ?? names[globalID],
      type: t,
      mutable: g.globalType.mutability !== 'const',
      value: 0,
      startAddress: g.loc.start.column,
      endAddress: g.loc.end.column,
    };
  });
}

function createSections(mod: ParsedModule): Section[] {
  return mod.sections.sort((a, b) => {
    return a.startAddress - b.startAddress;
  });
}

function createWasmFunctions(
  wasmPath: string,
  mod: ParsedModule,
): WASMFunction[] {
  const allLocalTypes = getLocalsTypes(wasmPath);
  const funcs: WASMFunction[] = [];
  for (let i = 0; i < mod.funcs.length; i++) {
    const fun = mod.funcs[i];
    const funcType = new WasmType(
      fun.signature.params.length,
      fun.signature.results.length,
    );
    const funcName = mod.funcNames.find((fn) => {
      return fn.value === fun.name.value;
    });
    if (funcName === undefined) {
      throw new Error(`Fun with name ${fun.name.value} has no identifier`);
    }

    const localTypes = allLocalTypes.get(funcName.index);
    const locals: WasmLocal[] = mod.localsNames
      .filter((l) => {
        return l.functionIndex === funcName.index;
      })
      .map((l) => {
        const local = localTypes?.find((lt) => lt.index === l.localIndex);
        let t: undefined | WASM.Type;
        if (local !== undefined) {
          const newType = WASM.typing.get(local.type);
          if (newType === undefined) {
            throw new Error(`Could not convert ${local.type} to WASM type`);
          }
          t = newType;
        } else {
          logger.warn(
            `Failed to find type of local index ${l.localIndex} named '${l.value}' of function id ${funcName.index}`,
          );
        }
        return {
          index: l.localIndex,
          name: l.value,
          type: t,
          mutable: true,
          value: 0,
        };
      });

    const f = new WASMFunction(
      fun.name.value,
      funcName.index,
      fun.body,
      funcType,
      locals,
    );
    funcs.push(f);
  }
  return funcs;
}

function createImportedFunctions(mod: ParsedModule): WASMFunction[] {
  const imports: WASMFunction[] = mod.imports.map((i, importID) => {
    const sign = i.descr.signature;
    const t = new WasmType(sign.params.length, sign.results.length);
    const f = new WASMFunction(i.name, importID, [], t, []);
    f.startAddress = i.loc.start.column;
    f.endAddress = i.loc.end.column;
    f.fullName = i.descr.id.value;
    return f;
  });
  return imports;
}

function retrieveAllInstructions(
  mod: ParsedModule,
  functions: WASMFunction[],
): WasmInstruction[] {
  const globalInstructions = retrieveGlobalInstructions(mod);
  const funcBodies = functions.flatMap((f) => {
    return f.allInstructions;
  });
  return globalInstructions.concat(funcBodies);
}

function retrieveGlobalInstructions(mod: ParsedModule): WasmInstruction[] {
  return mod.globals.flatMap((g) => {
    return g.init.flatMap((i) => [i].concat(i.allSubInstructions));
  });
}

/*
 * The Wasm module parser library does not retrieve the global names so we need to retrieve that
 */
function getGlobalNames(wasmFilePath: string): string[] {
  const objDump = getPath2ObjDump();
  const cmd = `${objDump} -x -m ${wasmFilePath}`;
  const outputCmd = execSync(cmd).toString();
  return getGlobalInfos(outputCmd)
    .sort((g1, g2) => {
      return g1.index - g2.index;
    })
    .map((s) => s.name);
}

/*
 * The Wasm module parser library does not retrieve the types of the locals so we need to retrieve that
 */
function getLocalsTypes(wasmFilePath: string): Map<number, VariableInfo[]> {
  const objDump = getPath2ObjDump();
  const outputCmdDetails = `${objDump} -d ${wasmFilePath}`;
  const result = execSync(outputCmdDetails).toString();
  return getLocalTypesFromDissambleOutput(result);
}
