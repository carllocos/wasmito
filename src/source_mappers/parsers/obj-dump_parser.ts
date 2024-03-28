import { type WasmType } from '../../state/opcode_type';
import { extractTypeInfo } from './details';

export interface VariableInfo {
  index: number;
  name: string;
  type: string; // todo use real type
  mutable: boolean;
  value: string; // todo use real value
}

export interface FunctionInfo {
  index: number;
  type: number;
  name: string;
  locals: VariableInfo[];
}

export interface LineInfo {
  line: number;
  columnStart: number;
  columnEnd: number;
  message: string;
}

export interface LineInfoPairs {
  lineAddress: number;
  lineInfo: LineInfo;
}

export function extractAddressInformation(addressLine: string): number {
  const regexpr = /^(?<address>([\da-f])+):/;
  const match = addressLine.match(regexpr);
  let hexaAddr = '';
  if (match?.groups !== undefined && match?.groups !== null) {
    hexaAddr = match.groups.address;
  }
  const addr = parseInt(hexaAddr, 16);
  if (isNaN(addr)) {
    throw Error(`Could not parse address from line: ${addressLine}`);
  }
  return addr;
}

function extractDetailedSection(section: string, input: string): string[] {
  const lines = input.split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].startsWith(section)) {
    i++;
  }

  if (i >= lines.length) {
    return [];
  }

  const count: number = +lines[i++].split(/[[\]]+/)[1];
  return lines.slice(i, isNaN(count) ? lines.length : i + count);
}

function extractMajorSection(section: string, input: string): string[] {
  const lines = input.split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].startsWith(section)) {
    i++;
  }

  i += 2;
  const start = i;
  while (i < lines.length && lines[i] !== '') {
    i++;
  }

  return lines.slice(start, i);
}

function extractGlobalInfo(line: string): VariableInfo {
  const global: VariableInfo = {
    index: -1,
    name: '',
    type: '',
    mutable: false,
    value: '',
  };

  let match = line.match(/\[([0-9]+)]/);
  global.index = match === null ? NaN : +match[1];
  match = line.match(/ ([if][0-9][0-9]) /);
  global.type = match === null ? 'undefined' : match[1];
  match = line.match(/<([a-zA-Z0-9 ._]+)>/);
  global.name =
    (match === null ? `${global.index}` : `$${match[1]}`) + ` (${global.type})`;
  match = line.match(/mutable=([0-9])/);
  global.mutable = match !== null && +match[1] === 1;
  match = line.match(/init.*=(.*)/);
  global.value = match === null ? '' : match[1];
  return global;
}

function extractImportInfo(line: string): FunctionInfo {
  const primitive: FunctionInfo = {
    index: -1,
    type: 0,
    name: '',
    locals: [],
  };
  let match = line.match(/func\[([0-9]+)\] sig=([0-9]+)/);
  if (match === null) {
    throw new Error(
      `Importsection does not contain function index and/or type index. Given: ${line}`,
    );
  }
  primitive.index = +match[1];
  primitive.type = +match[2];
  match = line.match(/<([a-zA-Z0-9 ._]+)>/);
  primitive.name = match === null ? `${primitive.index}` : `$${match[1]}`;
  return primitive;
}

export function getTypeInfos(input: string): Map<number, WasmType> {
  const lines: string[] = extractDetailedSection('Type[', input);

  const typesInfos: Map<number, WasmType> = new Map<number, WasmType>();
  lines.forEach((line) => {
    const wasmType = extractTypeInfo(line);
    if (wasmType === undefined) {
      throw new Error(`Parsed an invalid type info from line: ${line}`);
    }

    typesInfos.set(wasmType.id as number, wasmType);
  });
  return typesInfos;
}

export function getFunctionInfos(input: string): FunctionInfo[] {
  const functionSection: string[] = extractDetailedSection('Function[', input);
  const metadata: Map<number, number> = new Map<number, number>();
  let firstNonPrimiveFunc = -1;
  functionSection.forEach((s) => {
    const match = s.match(/func\[([0-9]+)\] sig=([0-9]+)/);
    if (match === null) {
      throw new Error(
        `function section does not contain idx and/or signature idx. Give: ${s}`,
      );
    }
    metadata.set(+match[1], +match[2]);
    if (firstNonPrimiveFunc === -1) {
      firstNonPrimiveFunc = +match[1];
    }
  });

  const functionLines: string[] = extractMajorSection('Sourcemap JSON:', input);

  if (functionLines.length === 0) {
    throw Error("Could not parse 'sourcemap' section of objdump");
  }

  const sourcemap = JSON.parse(functionLines.join('').replace(/\t/g, ''));
  const functions: FunctionInfo[] = [];
  sourcemap.Functions.forEach((func: any, index: number) => {
    // primitive functions are handled seperately
    if (index >= firstNonPrimiveFunc) {
      const locals: VariableInfo[] = [];
      func.locals.forEach((local: any) => {
        locals.push({
          index: local.idx,
          name: local.name,
          type: 'undefined',
          mutable: true,
          value: '',
        });
      });
      const typeIdx = metadata.get(index);
      if (typeIdx === undefined) {
        throw Error(`Parsing Error function ${index} has no typesignature`);
      }
      functions.push({
        index,
        name: func.name,
        locals,
        type: typeIdx,
      });
    }
  });
  return functions;
}

export function getGlobalInfos(input: string): VariableInfo[] {
  const lines: string[] = extractDetailedSection('Global[', input);
  const globals: VariableInfo[] = [];
  lines.forEach((line) => {
    globals.push(extractGlobalInfo(line));
  });
  return globals;
}

export function getImportInfos(input: string): FunctionInfo[] {
  const lines: string[] = extractDetailedSection('Import[', input);
  const imports: FunctionInfo[] = [];
  lines.forEach((line) => {
    imports.push(extractImportInfo(line));
  });
  return imports;
}

export function getLocalTypesFromDissambleOutput(
  input: string,
): Map<number, VariableInfo[]> {
  const lines = input.split('\n');
  const funcs = new Map<number, VariableInfo[]>();
  let f: number = -1;
  let funLocals: VariableInfo[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const funRegex = /func\[(\d+)\] <([^>]+)>/;
    const match = line.match(funRegex);
    if (match !== null) {
      const newfunIdx = Number(match[1]); // new function found
      if (isNaN(newfunIdx)) {
        throw new Error(`provided a non number as function ID ${match[1]}`);
      }
      if (f !== -1) {
        funcs.set(f, funLocals);
        funLocals = [];
      }
      f = newfunIdx;
      continue;
    }

    const localRegex = /local\[(\d+)\] type=([^\s]+)/;
    const matchLocal = line.match(localRegex);
    if (matchLocal !== null) {
      const localIdx = Number(matchLocal[1]);
      if (isNaN(localIdx)) {
        throw new Error(`provided a non number as local ID ${matchLocal[1]}`);
      }
      const typeLocal = matchLocal[2];
      funLocals.push({
        name: `local ${localIdx}`,
        type: typeLocal,
        index: localIdx,
        mutable: true,
        value: '0',
      });
    }

    const regexLocalRange = /local\[(\d+)\.\.(\d+)\] type=([^\s]+)/;
    const matchRange = line.match(regexLocalRange);
    if (matchRange !== null) {
      const start = Number(matchRange[1]);
      const end = Number(matchRange[2]);
      if (isNaN(start) || isNaN(end)) {
        throw new Error(
          `provided a non number as start ${matchRange[1]}local ID or end local ID${matchRange[2]}`,
        );
      }
      for (let i = start; i <= end; i++) {
        const type = matchRange[3];
        funLocals.push({
          name: `local ${i}`,
          type,
          index: i,
          mutable: true,
          value: '0',
        });
      }
    }
  }
  return funcs;
}
