import { createLogger } from '../../logger/logger';
import { WasmType } from './opcode_type';
import { WASM } from '../wasm';
import { WASMFunction, type WasmLocal } from './wasm_function';
import {
  type ModuleElement,
  type ModuleTableImport,
  type ParsedModule,
  parseWasmModule,
  type Section,
  type TableExport,
} from '../parsers/wasm_module_parser';
import { isCallInstruction, type WasmInstruction } from './wasm_instruction';
import {
  getWasmOpcodeNr,
  WasmOpcode,
  wasmOpcodeNameFromNumber,
} from './wasm_opcode';
import assert from 'assert';

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
  public readonly importFuncs: WASMFunction[];
  public readonly globals: WasmGlobal[];
  public readonly _functions: WASMFunction[];
  private readonly _ast: object;
  public readonly wasmBuffer: Buffer;
  private readonly _instructions: WasmInstruction[];
  private readonly _globalInstructions: WasmInstruction[];
  private readonly _sections: Section[];
  public readonly tableImports: ModuleTableImport[];
  public readonly tableExports: TableExport[];
  public readonly elements: ModuleElement[];

  constructor(wasmPath: string) {
    const [mod, errors] = parseWasmModule(wasmPath);
    if (errors.length > 0) {
      const errMsg = errors.join('\n');
      throw new Error(
        `Errors occurred while parsing module ${wasmPath}\n: ${errMsg}`,
      );
    }
    this.wasmPath = wasmPath;
    this._sections = createSections(mod);
    this._functions = createWasmFunctions(wasmPath, mod);
    this.importFuncs = createImportedFunctions(mod);
    this.globals = createWasmGlobals(mod);
    this.types = createWasmTypes(mod);
    this._ast = mod.ast;
    this.wasmBuffer = mod.wasmBuffer;
    this._globalInstructions = retrieveGlobalInstructions(mod);
    this._instructions = retrieveAllInstructions(mod, this.functions);
    this.correctCallInstructionsTypes();
    this.tableImports = mod.tableImports;
    this.tableExports = mod.tableExports;
    this.elements = mod.elements;
  }

  getMainFunction(): WASMFunction {
    const fs = this.getMainFunctions();
    assert(fs.length === 1, 'Only one main function is expected');
    return fs[0];
  }

  /**
   * get the functions defined in the module.
   * These functions exclude the imported functions.
   * To access the imported functions do `importFuncs`
   */
  get functions(): WASMFunction[] {
    return this._functions;
  }

  get instructions(): WasmInstruction[] {
    return this._instructions;
  }

  get locals(): WasmLocal[] {
    return this.functions.flatMap((f) => {
      return f.locals;
    });
  }

  getInstruction(addr: number): WasmInstruction | undefined {
    for (const f of this.functions) {
      if (addr < f.startAddress || f.endAddress <= addr) {
        continue;
      }
      return f.allInstructions.find((i) => i.startAddress === addr);
    }

    return undefined;
  }

  instructionsFromOpcode(opcode: WasmOpcode): WasmInstruction[] {
    const nr = getWasmOpcodeNr(opcode);
    const instrs: WasmInstruction[] = [];
    for (const f of this.functions) {
      f.instructionsFromOpcode(nr).forEach((i) => instrs.push(i));
    }
    return instrs;
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
      return i.startAddress <= addr && addr <= i.endAddress;
    });

    if (globalInstruction !== undefined) {
      return globalInstruction;
    }

    // addr is in a function body
    for (let i = 0; i < this.functions.length; i++) {
      const fun = this.functions[i];
      if (fun.startAddress <= addr && addr <= fun.endAddress) {
        return this.searchInFunBody(fun.body, addr);
      }
    }
    return undefined;
  }

  private searchInFunBody(
    body: WasmInstruction[],
    addr: number,
  ): WasmInstruction | undefined {
    for (let i = 0; i < body.length; i++) {
      const inst = body[i];
      const found = this.searchInstruction(inst, addr);
      if (found === undefined) {
        continue;
      }

      return this.correctPotentialInstruction(body, found, addr);
    }

    return undefined;
  }

  private correctPotentialInstruction(
    funBody: WasmInstruction[],
    instrFound: WasmInstruction,
    addr: number,
  ): WasmInstruction {
    /*
     * There is an edge case where addr can be the same as the end addr of an instruction
     * and the start address of the next instruction.
     * if so we return the next instr
     */

    if (instrFound.endAddress === addr) {
      // search for next instruction if it exists
      const candidateInstr = funBody.filter((i) => {
        const sa = i.startAddress;
        const ea = i.endAddress;
        return sa <= addr && addr <= ea;
      });

      for (let j = 0; j < candidateInstr.length; j++) {
        const instr = candidateInstr[j];
        if (instr.startAddress === addr) {
          return instr;
        }
        const subInstr = instr.allSubInstructions.find((i) => {
          return i.startAddress === addr;
        });

        if (subInstr !== undefined) {
          return subInstr;
        }
      }
      return instrFound;
    }

    return instrFound;
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
    if (id >= this.importFuncs.length) {
      return this.functions.find((f) => {
        return f.id === id;
      });
    } else {
      return this.importFuncs.find((f) => {
        return f.id === id;
      });
    }
  }

  public getFunctionOrError(id: number): WASMFunction {
    const f = this.getFunction(id);
    if (f === undefined) {
      throw new Error(`Could not find Function with id ${id}`);
    }
    return f;
  }

  public getFunctionFromAddr(addr: number): WASMFunction | undefined {
    for (const wasmFunc of this.functions) {
      if (wasmFunc.isAddressInFunction(addr)) {
        return wasmFunc;
      }
    }
  }

  public getMainFunctions(): WASMFunction[] {
    const mainNames = new Set<string>(['main', '_main', '_start']);
    const funcs: WASMFunction[] = [];
    const added = new Set<number>();
    for (const f of this.functions) {
      if (
        !added.has(f.id) &&
        (mainNames.has(f.name) || (f.exported && mainNames.has(f.exportName)))
      ) {
        funcs.push(f);
        added.add(f.id);
      }
    }
    return funcs;
  }

  public allExportedFuncs(): WASMFunction[] {
    // imported host funcs could call
    // (1) any explicitly exported func in module marked with `export`
    // (2) any func added to a table imported by the host environment
    // (3) any func added to a table exported by the module
    const allExportedFuncs = this.functions.filter((f) => f.exported);
    const added = new Set<number>();
    for (const ti of this.tableImports) {
      for (const el of this.elements) {
        if (el.tableId === ti.id) {
          el.funcs.forEach((fid) => {
            if (!added.has(fid)) {
              allExportedFuncs.push(this.getFunctionOrError(fid));
              added.add(fid);
            }
          });
        }
      }
    }
    for (const te of this.tableExports) {
      for (const el of this.elements) {
        if (el.tableId === te.id) {
          el.funcs.forEach((fid) => {
            if (!added.has(fid)) {
              allExportedFuncs.push(this.getFunctionOrError(fid));
              added.add(fid);
            }
          });
        }
      }
    }
    return allExportedFuncs;
  }

  private correctCallInstructionsTypes(): void {
    this.instructions.forEach((i: WasmInstruction) => {
      if (isCallInstruction(i)) {
        const fun = this.getFunction(i.funIdx);
        if (fun === undefined) {
          throw new Error(`Fun not found with id ${i.funIdx}`);
        }
        i.signature = fun.type;
      }
    });
  }

  private searchInstruction(
    inst: WasmInstruction,
    wasmAddr: number,
  ): WasmInstruction | undefined {
    const startAddress = inst.startAddress;
    const endAddress = inst.endAddress;
    if (startAddress <= wasmAddr && wasmAddr <= endAddress) {
      if (inst.allSubInstructions.length > 0) {
        for (const subInstr of inst.allSubInstructions) {
          const f = this.searchInstruction(subInstr, wasmAddr);
          if (f !== undefined) {
            return f;
          }
        }
        if (startAddress !== wasmAddr && endAddress !== wasmAddr) {
          logger.debug(
            `Case where addr is within instr (opcodeNr=${inst.opcodeNr}) but no subinstruction found`,
          );
          return undefined;
        }
      }
      return inst;
    }

    return undefined;
  }

  toJSON(): object {
    const functions: object[] = [];

    for (const f of this.functions) {
      const allInstructions: object[] = [];
      for (const instr of f.allInstructions) {
        allInstructions.push({
          name: wasmOpcodeNameFromNumber(instr.opcodeNr),
          opcode: instr.opcodeNr,
          opcodeHex: `0x${instr.opcodeNr.toString(16)}`,
          start: instr.startAddress,
          end: instr.endAddress,
          startHex: `0x${instr.startAddress.toString(16)}`,
          endHex: `0x${instr.endAddress.toString(16)}`,
          immediate: instr.immediate ?? -1,
          args: instr.args,
        });
      }
      functions.push({
        name: f.name,
        idx: f.id,
        body: allInstructions,
      });
    }
    const imports: object[] = this.importFuncs.map((im) => {
      return {
        name: im.name,
        idx: im.id,
      };
    });
    return {
      wasmPath: this.wasmPath,
      functions,
      imports,
    };
  }
}

function createWasmTypes(mod: ParsedModule): WasmType[] {
  return mod.types;
}

function createWasmGlobals(mod: ParsedModule): WasmGlobal[] {
  return mod.globals.map((g, globalID) => {
    const t = WASM.typing.get(g.globalType.valtype);
    if (t === undefined) {
      throw new Error(`Could not convert ${g.globalType.valtype} to WASM type`);
    }
    return {
      index: globalID,
      name: g.name ?? `global${globalID}`,
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

    // funcName might not be available
    const funcName = mod.funcNames.find((fn) => {
      return fn.value === fun.name.value;
    });

    const funExported = mod.exportedFuncs.find((ef) => {
      return (
        ef.name === fun.name.value ||
        (fun.id !== undefined && ef.id === fun.id) ||
        (ef.innerName !== undefined && ef.innerName === fun.name.value)
      );
    });

    // The following tries to derive the funID
    // from different sources from the parsed module
    let funID = -1;
    if (fun.id !== undefined) {
      funID = fun.id;
    } else if (funcName !== undefined) {
      funID = funcName.index;
    } else {
      // try to derive from fun name
      if (funExported?.id === undefined) {
        throw new Error(
          `Could not derive identifier for Fun with name ${fun.name.value}`,
        );
      }
      funID = funExported.id;
    }

    const localTypes = allLocalTypes.get(funID);
    const locals: WasmLocal[] = mod.localsNames
      .filter((l) => {
        return l.functionIndex === funID;
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
        }
        // else {
        //   logger.warn(
        //     `Failed to find type of local index ${l.localIndex} named '${l.value}' of function id ${funID}`,
        //   );
        // }
        return {
          index: l.localIndex,
          name: l.value,
          type: t,
          mutable: true,
          value: 0,
        };
      });

    let exportName = '';
    if (funExported?.innerName !== undefined) {
      exportName = funExported.name;
    }
    const f = new WASMFunction(
      fun.name.value,
      funID,
      fun.body,
      fun.signature,
      locals,
      funExported !== undefined,
      exportName,
    );
    funcs.push(f);
  }
  return funcs;
}

function createImportedFunctions(mod: ParsedModule): WASMFunction[] {
  const imports: WASMFunction[] = mod.funcImports.map((i, importID) => {
    const sign = i.descr.signature;
    const t = new WasmType(sign.params.length, sign.results.length);
    const exported = false;
    const f = new WASMFunction(i.name, importID, [], t, [], exported);
    f.startAddress = i.loc.start.column;
    f.endAddress = i.loc.end.column;
    f.fullName = i.descr.id;
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

export interface VariableInfo {
  index: number;
  name: string;
  type: string; // todo use real type
  mutable: boolean;
  value: string; // todo use real value
}

/*
 * The Wasm module parser library does not retrieve the types of the locals so we need to retrieve that
 */
function getLocalsTypes(_wasmFilePath: string): Map<number, VariableInfo[]> {
  return new Map();
}
