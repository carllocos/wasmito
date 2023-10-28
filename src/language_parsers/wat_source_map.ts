import { type WasmType } from '../state/opcode_type';
import { replaceFileExtension } from '../util/file_util';
import { readFunctionTypes, readImports, readTypes } from './details';
import { readDissambledOpcodes } from './dissambled';
import { WasmOpcode } from './opcodes';

export class WASMFunction {
  public readonly name: string;
  public readonly id: number;
  public readonly opcodes: Array<{ address: number; opcode: WasmOpcode }>;
  public readonly type: WasmType;
  private smallestAddress?: number;
  private greatestAddress?: number;

  constructor(
    name: string,
    id: number,
    opcodes: Array<{ address: number; opcode: WasmOpcode }>,
    funcType: WasmType,
  ) {
    this.name = name;
    this.id = id;
    this.opcodes = opcodes;
    this.type = funcType;
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
}

export class WATSourceMap {
  public readonly functions: WASMFunction[];
  public readonly imports: WASMFunction[];

  constructor(functions: WASMFunction[], imported: WASMFunction[]) {
    this.functions = functions;
    this.imports = imported;
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
    opcode: WasmOpcode;
  }> {
    let opcodes: Array<{
      address: number;
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

  static async fromPath(path: string): Promise<WATSourceMap | undefined> {
    const detailsPath = replaceFileExtension(path, '.details');
    const types = readTypes(detailsPath);
    if (types === undefined) {
      return undefined;
    }
    const funcTypes = readFunctionTypes(detailsPath);
    if (funcTypes === undefined) {
      return undefined;
    }
    const importFuncsData = readImports(detailsPath);
    if (importFuncsData === undefined) {
      return undefined;
    }
    const importedFuncs: WASMFunction[] = [];
    for (const i of importFuncsData) {
      const funcTypeNr = i.typeID;
      if (funcTypeNr === undefined) {
        return undefined;
      }
      const funcType = types.find((t) => {
        return t.id === funcTypeNr;
      });
      if (funcType === undefined) {
        return undefined;
      }
      importedFuncs.push(
        new WASMFunction(i.importName, i.funcID, [], funcType),
      );
    }
    const opcodes = await readDissambledOpcodes(
      replaceFileExtension(path, '.diss'),
    );
    if (opcodes === undefined) {
      return undefined;
    }
    const funcs: WASMFunction[] = [];
    const regexPattern = /func\[(\d+)\](?:_<([^>]*)>)?/;
    for (const funcKey of opcodes.keys()) {
      const match = funcKey.match(regexPattern);
      if (match === undefined || match === null) {
        return undefined;
      }

      const funcId = parseInt(match[1]); // Contains the number in square brackets
      if (isNaN(funcId)) {
        return undefined;
      }
      let funcName = match[2];
      if (funcName === '' || funcName === undefined) {
        funcName = `func_${funcId}`;
      }
      const codes = opcodes.get(funcKey);
      if (codes === undefined) {
        return undefined;
      }
      const funcTypeNr = funcTypes.get(funcId);
      if (funcTypeNr === undefined) {
        return undefined;
      }
      const funcType = types.find((t) => {
        return t.id === funcTypeNr;
      });
      if (funcType === undefined) {
        return undefined;
      }
      const c = codes.map((d) => {
        return {
          address: d.address,
          opcode: new WasmOpcode(d.opcodeName, d.opcodeLabels, d.opcodeNr),
        };
      });
      funcs.push(new WASMFunction(funcName, funcId, c, funcType));
    }

    if (funcs.length === 0) {
      return undefined;
    }

    for (const func of funcs) {
      const funsCalled = func.opcodes
        .filter((op) => {
          return op.opcode.name.includes('call');
        })
        .map((op) => {
          const labels = op.opcode.getLabels();
          if (labels.length === 0) {
            throw new Error(
              `found a call opcode without funcId ${op.opcode.name} labels`,
            );
          }

          const funcNr = parseInt(labels[0]);
          if (isNaN(funcNr)) {
            throw new Error(
              `func Id is not a number of call opcode ${op.opcode.name}`,
            );
          }
          return { opcode: op.opcode, funCalled: funcNr };
        });

      for (const callOpcode of funsCalled) {
        let func: WASMFunction | undefined;
        if (callOpcode.funCalled >= importedFuncs.length) {
          func = funcs.find((f) => {
            return f.id === callOpcode.funCalled;
          });
        } else {
          func = importedFuncs.find((f) => {
            return f.id === callOpcode.funCalled;
          });
        }
        if (func === undefined) {
          throw new Error(
            `fun called with ID ${callOpcode.funCalled} is not part of the defined or imported funcs`,
          );
        }
        callOpcode.opcode.changeType(func.type);
      }
    }

    return new WATSourceMap(funcs, importedFuncs);
  }
}
