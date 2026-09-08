import { createLogger } from '../../logger/logger';
import { WasmType } from './opcode_type';
import { WASM } from '../wasm';
import { WASMFunction, type WasmLocal } from './wasm_function';
import {
  type ElementSource,
  type FuncExportSource,
  type ParsedModule,
  parseWasmModule,
  type Section,
  type TableExportSource,
  type TableImportSource,
} from '../parsers/wasm_module_parser';
import {
  CallInstruction,
  isCallInstruction,
  isConst,
  type WasmInstruction,
} from './wasm_instruction';
import { getOpcodeName, getWasmOpcodeNr, WasmOpcode } from './wasm_opcode';
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
  initInstrs: WasmInstruction[];
}

export class WasmModule {
  public readonly wasmPath: string;

  public readonly types: WasmType[];
  public readonly importFuncs: WASMFunction[];
  public readonly globals: WasmGlobal[];
  public readonly _functions: WASMFunction[];
  public readonly wasmBuffer: Buffer;
  private readonly _instructions: WasmInstruction[];
  private readonly _globalInstructions: WasmInstruction[];
  private readonly _sections: Section[];
  public readonly tableImports: TableImportSource[];
  public readonly tableExports: TableExportSource[];
  public readonly elements: ElementSource[];

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
    this._functions = createWasmFunctions(mod);
    this.importFuncs = createImportedFunctions(mod);
    this.globals = createWasmGlobals(mod);
    this.types = mod.types;
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
      for (const i of f.allInstructions) {
        // for instead of find to reduce memory
        if (i.startAddress === addr) {
          return i;
        }
      }
    }

    return undefined;
  }

  instructionsFromOpcode(opcode: WasmOpcode): WasmInstruction[] {
    let instrs: WasmInstruction[] = [];
    for (const f of this.functions) {
      instrs = [...instrs, ...f.instructionsFromOpcode(opcode)]; // trick to avoid running out of stack
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

  public getEnclosingFunction(instr: number | WasmInstruction): WASMFunction {
    const func = this.getEnclosingFunctionOrUndefined(instr);
    assert(func !== undefined);
    return func;
  }

  public getEnclosingFunctionOrUndefined(
    instr: number | WasmInstruction,
  ): WASMFunction | undefined {
    let addr = 0;
    if (typeof instr !== 'number') {
      addr = instr.startAddress;
    } else {
      addr = instr;
    }
    return this.getFunctionFromAddr(addr);
  }
  /**
   * This returns all call instructions if no argument is provided
   * or only returns the call instructions that are equal to the given func ID
   * or func name
   * Retrieving calls based on the name of the function called is dependent on the correctness
   * of the debugging and is does not always reliabily correspond to the source level function names.
   * @param func
   * @returns
   */
  getCallInstructions(func?: string | number): CallInstruction[] {
    const calls = this.instructions.filter(isCallInstruction);
    if (func === undefined) return calls;

    let funID = -1;
    if (typeof func === 'number') {
      funID = func;
    } else {
      // todo fix: this may produce several funcs
      const f = this.functions.find((f) => f.name.includes(func));
      funID = f?.id ?? funID;
    }

    return calls.filter((c) => c.funIdx === funID);
  }
  public getStartFunction(): WASMFunction | undefined {
    const funcs = this.getMainFunctions();
    if (funcs.length === 0) return undefined;
    assert(
      funcs.length === 1,
      `only one _start function expected: Found ${funcs.length}`,
    );
    return funcs[0];
  }

  private getFunctions(namesFuncs: string[]): WASMFunction[] {
    const names: Set<string> = new Set(namesFuncs);
    const funcs: WASMFunction[] = [];
    const added = new Set<number>();
    for (const f of this.functions) {
      if (
        !added.has(f.id) &&
        (names.has(f.name) || (f.exported && names.has(f.exportName)))
      ) {
        funcs.push(f);
        added.add(f.id);
      }
    }
    return funcs;
  }

  public getMainFunctions(): WASMFunction[] {
    const mainNames = ['main', '_main', '_start'];
    return this.getFunctions(mainNames);
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
            `Case where addr is within instr (opcodeNr=${getWasmOpcodeNr(inst.opcode)}) but no subinstruction found`,
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
        const nr = getWasmOpcodeNr(instr.opcode);
        allInstructions.push({
          name: getOpcodeName(instr.opcode),
          opcode: nr,
          opcodeHex: `0x${nr.toString(16)}`,
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

function createSections(mod: ParsedModule): Section[] {
  return mod.sections.sort((a, b) => {
    return a.startAddress - b.startAddress;
  });
}

function createWasmGlobals(mod: ParsedModule): WasmGlobal[] {
  return mod.globals.map((g, globalID) => {
    let initValue = 0;
    let found = false;
    for (const i of g.init) {
      if (isConst(i)) {
        if (found) {
          throw new Error(
            `the initial value for global ${globalID} was already set to ${initValue}. There are in total ${g.init.length} instructions`,
          );
        }
        found = true;
        initValue = i.value;
      }
    }
    return {
      index: globalID,
      name: g.name ?? `global${globalID}`,
      type: g.type,
      mutable: g.mutable,
      value: initValue,
      startAddress: g.startAddress,
      endAddress: g.endAddress,
      initInstrs: g.init,
    };
  });
}

function createWasmFunctions(mod: ParsedModule): WASMFunction[] {
  return mod.funcs.map((f) => {
    const funExported: FuncExportSource | undefined = mod.exportedFuncs.find(
      (ef) => ef.funcIndex === f.id,
    );
    const locals: WasmLocal[] = f.locals.map((l) => {
      return {
        index: l.index,
        name: l.name,
        type: l.type,
        mutable: true,
        value: 0,
      };
    });
    return new WASMFunction(
      f.name,
      f.id,
      f.body,
      f.type,
      locals,
      funExported !== undefined,
      funExported?.name ?? '',
    );
  });
}

function createImportedFunctions(mod: ParsedModule): WASMFunction[] {
  const imports: WASMFunction[] = mod.funcImports.map((i, importID) => {
    const exported = false;
    const f = new WASMFunction(i.name, importID, [], i.type, [], exported);
    f.startAddress = i.startAddress;
    f.endAddress = i.endAddress;
    f.fullName = i.name;
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
    return f.allInstructions.map((i) => {
      i.enclosingFunction = f;
      return i;
    });
  });
  return globalInstructions.concat(funcBodies);
}

function retrieveGlobalInstructions(mod: ParsedModule): WasmInstruction[] {
  return mod.globals.flatMap((g) => {
    return g.init.flatMap((i) => [i].concat(i.allSubInstructions));
  });
}
