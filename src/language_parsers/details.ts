import * as fs from 'fs';
import { WasmType } from '../state/opcode_type';

/*
 * Parser for output generated from `wasm-objdump -x` command
 */

function extractTypeInfo(
  input: string,
): { number: number; args: string[]; resultType: string } | undefined {
  const pattern = /type\[(\d+)\]\s*\(([^)]*)\)\s*->\s*(\w+)/;
  const match = input.match(pattern);

  if (match !== undefined && match !== null) {
    const number = parseInt(match[1], 10);
    const args =
      match[2] === ''
        ? []
        : match[2].split(',').map((keyword) => keyword.trim());
    const resultType = match[3];

    return {
      number,
      args,
      resultType,
    };
  }

  return undefined;
}

function extractFuncNumbersAndType(
  input: string,
): { funcID: number; typeID: number } | undefined {
  const regex = /func\[(\d+)\] sig=(\d+)/;
  const match = input.match(regex);

  if (match !== null) {
    const number1 = parseInt(match[1]);
    const number2 = parseInt(match[2]);
    return { funcID: number1, typeID: number2 };
  }

  return undefined;
}

function extractImportNrInfo(
  line: string,
): { funcID: number; typeID: number; importName: string } | undefined {
  const funcIDReg = line.match(/\[(\d+)\]/);
  const typeIDReg = line.match(/sig=(\d+)/);
  const nameReg = line.match(/<([^>]+)>/);

  const funcID = funcIDReg !== null ? parseInt(funcIDReg[1]) : undefined;
  const typeID = typeIDReg !== null ? parseInt(typeIDReg[1]) : undefined;
  const name = nameReg !== null ? nameReg[1] : undefined;
  if (funcID === undefined || typeID === undefined || name === undefined) {
    return undefined;
  }

  if (isNaN(funcID) || isNaN(typeID)) {
    return undefined;
  }

  return {
    funcID,
    typeID,
    importName: name,
  };
}

export function readTypes(path: string): WasmType[] | undefined {
  //   const typeMap = new Map<number, string[]>();
  const content = fs.readFileSync(path, 'utf8');
  const lines = content
    .split('\n')
    .filter((line: string) => {
      return line.includes('- type[');
    })
    .map(extractTypeInfo);

  if (lines.length === 0) {
    return undefined;
  }

  const types = lines
    .map((obj) => {
      if (obj !== undefined) {
        const nrArgs =
          obj.resultType.trim().toLocaleLowerCase() !== 'nil' ? 1 : 0;
        return new WasmType(obj.args.length, nrArgs, obj.number);
      } else {
        return undefined;
      }
    })
    .filter((l) => {
      return l !== undefined;
    });
  if (types.length !== lines.length) {
    return undefined;
  }

  const resultTypes: WasmType[] = [];
  for (const t of types) {
    if (t !== undefined) {
      resultTypes.push(t);
    }
  }

  return resultTypes;
}

export function readFunctionTypes(
  path: string,
): Map<number, number> | undefined {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content
    .split('\n')
    .filter((line: string) => {
      return line.includes('- func[');
    })
    .map(extractFuncNumbersAndType);

  if (lines.length === 0) {
    return undefined;
  }

  const resultTypes = new Map<number, number>();
  for (const d of lines) {
    if (d !== undefined) {
      resultTypes.set(d.funcID, d.typeID);
    }
  }

  return resultTypes;
}

export function readImports(path: string):
  | Array<{
      funcID: number;
      typeID: number;
      importName: string;
    }>
  | undefined {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');

  const importLines: string[] = [];
  let foundImportStart = false;
  for (const l of lines) {
    if (foundImportStart) {
      if (l.includes('func[')) {
        importLines.push(l);
      } else {
        break;
      }
    } else if (l.includes('Import[')) {
      foundImportStart = true;
    }
  }

  if (importLines.length === 0) {
    return undefined;
  }
  const impts = importLines.map(extractImportNrInfo);
  if (impts.length !== importLines.length) {
    return undefined;
  }

  const results: Array<{
    funcID: number;
    typeID: number;
    importName: string;
  }> = [];

  for (const i of impts) {
    if (i !== undefined) {
      results.push(i);
    }
  }
  return results;
}
