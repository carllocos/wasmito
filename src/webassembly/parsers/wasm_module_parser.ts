import { readFileSync } from 'fs';
import { createLogger } from '../../logger/logger';
import { WasmType } from '../wasm/opcode_type';
import {
  BlockInstruction,
  Branch,
  BranchIf,
  BranchTable,
  CallIndirect,
  CallInstruction,
  ConstInstr,
  IfInstruction,
  LoopInstruction,
  ReturnBranch,
  WasmInstruction,
} from '../wasm/wasm_instruction';
import { WASM } from '../wasm';
import { WASMOpcodeNumber, wasmOpcodeFromStr } from '../wasm/wasm_opcode';
import { IsOpcodeWasmVersion1 } from '../wasm/wasm_versions';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const decode = require('@webassemblyjs/wasm-parser');
const logger = createLogger('WasmParser');

interface LocalName {
  type: string;
  value: string;
  localIndex: number;
  functionIndex: number; // the function to which they belong
}

interface MetaDataFunctionName {
  type: string;
  value: string;
  index: number;
}

interface Location {
  line: number;
  column: number;
}

interface WasmSourceLocation {
  start: Location;
  end: Location;
}

interface FuncTypeOfInstructionType {
  type: string;
  params: ValType[];
  results: string[];
}

interface ValType {
  id: undefined | string;
  valtype: string;
}

interface FuncName {
  type: string;
  value: string;
  numeric: string;
}

interface FuncSignature {
  type: 'Signature';
  params: ValType[];
  results: string[];
}

interface InstructionArg {
  type: string;
  value: number;
  raw: string;
}

export enum SectionType {
  Type,
  Import,
  Function,
  Table,
  Global,
  Code,
  Memory,
  Export,
  Element,
  Custom,
  Data,
  Start,
}

export interface Section {
  type: SectionType;
  startAddress: number;
  endAddress: number;
  sectionSize: number;
}

export interface ParsedModule {
  localsNames: LocalName[];
  exportedFuncs: FunExport[];
  funcNames: MetaDataFunctionName[];
  types: WasmType[];
  funcs: Func[];
  tableImports: ModuleTableImport[];
  funcImports: ModuleFuncImport[];
  elements: ModuleElement[];
  globals: ParsedGlobal[];
  sections: Section[];
  ast: any;
  wasmBuffer: Buffer;
}

interface Func {
  type: 'Func';
  name: FuncName;
  id?: number;
  signature: WasmType;
  body: WasmInstruction[];
  bodySize: number;
}

export interface ModuleFuncImportDescription {
  type: string;
  id: string;
  signature: FuncSignature;
}

export interface ModuleFuncImport {
  module: string;
  name: string;
  descr: ModuleFuncImportDescription;
  loc: WasmSourceLocation;
}

enum ImportType {
  FuncImport = 'FuncImportDescr',
  TableImport = 'Table',
}

export interface ModuleTableImportDescription {
  type: string;
  value: string;
  id: number;
}

export interface ModuleTableImport {
  module: string;
  name: string;
  descr: ModuleTableImportDescription;
  loc: WasmSourceLocation;
}

export interface GlobalType {
  type: 'GlobalType';
  valtype: string;
  mutability: string;
}

export interface ParsedGlobal {
  type: 'Global';
  globalType: GlobalType;
  init: WasmInstruction[];
  name: undefined | string;
  loc: WasmSourceLocation;
}

function assertInstructionArg(arg: any): asserts arg is InstructionArg {
  if (
    typeof arg === 'object' &&
    'type' in arg &&
    typeof arg.type === 'string' &&
    'value' in arg &&
    typeof arg.value === 'number' &&
    'raw' in arg &&
    typeof arg.raw === 'string'
  ) {
    return;
  }
  throw new Error('Arg does not satisfy the InstructionArg Interface');
}

function parseFunc(obj: any): [Func | undefined, string[]] {
  if (typeof obj !== 'object') {
    return [undefined, ['ParseFunc exepcts object']];
  }

  const type = obj.type;
  if (typeof type !== 'string' || type !== 'Func') {
    return [undefined, ['object does not have Func Interface']];
  }
  if (
    typeof obj.metadata !== 'object' ||
    typeof obj.metadata.bodySize !== 'number'
  ) {
    return [undefined, ['object does not have Func Interface']];
  }

  const name = obj.name;
  checkFuncName(name);

  const funName =
    obj.name.numeric !== undefined ? obj.name.numeric : obj.name.value;
  const regID = /^func_([0-9]+)$/;
  const foundID = regID.exec(funName);
  let fID: number | undefined;
  if (foundID !== undefined && foundID !== null) {
    fID = +foundID[1];
  }
  assertFuncSignature(obj.signature);
  const signature = parseWasmType(obj.signature);

  let errors: string[] = [];
  const body = obj.body;
  if (!Array.isArray(body)) {
    errors.push('Func Body is expected to be an array of Instructions');
    return [undefined, errors];
  }
  const bodyInstrs: WasmInstruction[] = [];
  const parsedBody = body.map((inst) => {
    return parseInstruction(inst);
  });

  for (const v of parsedBody) {
    if (v instanceof WasmInstruction) {
      bodyInstrs.push(v);
    } else if (v instanceof Array) {
      errors = errors.concat(v);
    }
  }

  const f: Func = {
    type,
    name,
    id: fID,
    signature,
    body: bodyInstrs,
    bodySize: obj.metadata.bodySize,
  };
  return [f, errors];
}

function checkFuncName(obj: any): asserts obj is FuncName {
  if (
    typeof obj !== 'object' ||
    typeof obj.type !== 'string' ||
    obj.type !== 'Identifier' ||
    typeof obj.value !== 'string'
  ) {
    if (obj.numeric !== undefined && typeof obj.numeric === 'string') {
      return;
    } else if (
      obj.numeric === undefined &&
      obj.raw !== undefined &&
      obj.raw === ''
    ) {
      obj.numeric = obj.value;
      return;
    }
    throw new Error('Object does not satisfy the FuncName interface');
  }
}

function assertFuncSignature(obj: any): asserts obj is FuncSignature {
  if (
    typeof obj !== 'object' ||
    obj.type !== 'Signature' ||
    !Array.isArray(obj.params) ||
    !Array.isArray(obj.results)
  ) {
    throw new Error('Object does not satisfy the FuncSignature interface');
  }

  for (let i = 0; i < obj.params.length; i++) {
    checkValType(obj.params[i]);
  }
  for (let i = 0; i < obj.results.length; i++) {
    if (typeof obj.results[i] !== 'string') {
      throw new Error(`obj.result item is expected to be a type`);
    }
  }
}

function tryToOpcodeOrErrorMsg(opcode: string): WASMOpcodeNumber | string {
  try {
    return wasmOpcodeFromStr(opcode);
  } catch (e) {
    if (e instanceof Error) {
      return e.message;
    }
    return `error occurred during wasmOpcodeFromStr: ${e}`;
  }
}

function parseInstruction(obj: any): WasmInstruction | string[] | undefined {
  if (
    typeof obj !== 'object' ||
    typeof obj.type !== 'string' ||
    typeof obj.id !== 'string'
  ) {
    return [`obj doest not satisfy the WasmInstruction Interface`];
  }
  let op: WasmInstruction | undefined;
  switch (obj.id) {
    case 'get_local': {
      assertWasmSourceCodeLocation(obj.loc);
      op = new WasmInstruction(
        'get_local',
        WASMOpcodeNumber.Get_local,
        obj.args[0].value,
      );
      break;
    }
    case 'set_local': {
      op = new WasmInstruction('set_local', WASMOpcodeNumber.Set_local);
      op.args = obj.args.map((a: any) => {
        return a.name;
      });
      break;
    }
    case 'call': {
      op = parseCall(obj);
      break;
    }
    case 'call_indirect': {
      if (obj.signature === undefined) {
        return [`call_indirect instruction is missing 'signature'`];
      }
      const expectedKeys = new Set<string>(['type', 'id', 'signature', 'loc']);
      const keys = Object.keys(obj);
      for (const k of keys) {
        if (!expectedKeys.has(k)) {
          return [`Key of Call_indirect ${k} is not being accounted for`];
        }
      }
      const t = parseWasmType(obj.signature);
      op = new CallIndirect(t);
      break;
    }
    case 'end': {
      if (!Array.isArray(obj.args)) {
        return ['Invalid end instruction'];
      }
      const labels = obj.args.map((a: any) => {
        assertInstructionArg(a);
        return a.value;
      });
      op = new WasmInstruction('end', WASMOpcodeNumber.End);
      op.args = labels;
      break;
    }
    case 'get_global': {
      if (obj.args.length > 1) {
        return [
          `Handle case in 'get_global' where args has more than one element ${obj.args}`,
        ];
      }
      op = new WasmInstruction(
        'get_global',
        WASMOpcodeNumber.Get_global,
        obj.args[0].value,
      );
      break;
    }
    case 'set_global': {
      if (obj.args.length > 1) {
        return [
          `Handle case in 'set_global' where args has more than one element ${obj.args}`,
        ];
      }
      op = new WasmInstruction(
        'set_global',
        WASMOpcodeNumber.Set_global,
        obj.args[0].value,
      );
      break;
    }
    case 'drop': {
      op = new WasmInstruction('drop', WASMOpcodeNumber.Drop);
      break;
    }
    case 'local': {
      return undefined;
    }
    case 'return': {
      op = new ReturnBranch();
      break;
    }
    case 'block': {
      const label = obj.label.value;
      const parsedOpcodes: Array<WasmInstruction | undefined | string[]> =
        obj.instr.map((o: any) => {
          return parseInstruction(o);
        });

      const opcodes: WasmInstruction[] = [];
      let errors: string[] = [];
      for (const v of parsedOpcodes) {
        if (v instanceof WasmInstruction) {
          opcodes.push(v);
        } else if (v instanceof Array) {
          errors = errors.concat(v);
        }
      }

      if (errors.length > 0) {
        return errors;
      }
      op = new BlockInstruction(label, opcodes);
      break;
    }
    case 'loop': {
      const label = obj.label.value;
      const parsedOpcodes = obj.instr.map((o: any) => {
        return parseInstruction(o);
      });

      const opcodes: WasmInstruction[] = [];
      let errors: string[] = [];
      for (const v of parsedOpcodes) {
        if (v instanceof WasmInstruction) {
          opcodes.push(v);
        } else if (v instanceof Array) {
          errors = errors.concat(v);
        }
      }

      let loopResultType: WASM.Type | undefined;

      if (obj.resulttype !== null) {
        loopResultType = WASM.typing.get(obj.resulttype);
        if (loopResultType === undefined) {
          errors.push(`Loop resultType ${obj.resulttype} does not exist`);
        }
      }
      if (errors.length > 0) {
        return errors;
      }

      op = new LoopInstruction(label, opcodes, loopResultType);
      break;
    }
    case 'if': {
      const label = obj.testLabel.value;
      let result: WASM.Type | undefined;
      if (obj.result !== null) {
        result = WASM.typing.get(obj.result);
        if (result === undefined) {
          return [`If expression returns an unsupported type ${obj.result}`];
        }
      }

      const test: WasmInstruction[] = obj.test
        .map((o: any) => {
          return parseInstruction(o);
        })
        .filter((i: WasmInstruction | undefined) => i !== undefined);
      const alternate: WasmInstruction[] = obj.alternate
        .map((o: any) => {
          return parseInstruction(o);
        })
        .filter((i: WasmInstruction | undefined) => i !== undefined);
      const consequent: WasmInstruction[] = obj.consequent
        .map((o: any) => {
          return parseInstruction(o);
        })
        .filter((i: WasmInstruction | undefined) => i !== undefined);
      op = new IfInstruction(label, test, alternate, consequent, result);
      break;
    }
    case 'br': {
      if (obj.args.length > 1) {
        return [
          `Handle case where 'br' args has more than one element ${obj.args}`,
        ];
      }
      op = new Branch(obj.args[0].value);
      break;
    }
    case 'br_if': {
      if (obj.args.length > 1) {
        return [
          `Handle case where 'br_if' args has more than one element ${obj.args}`,
        ];
      }
      op = new BranchIf(obj.args[0].value);
      break;
    }
    case 'gt_s': {
      const opcode = obj.object + '.gt_s';
      if (obj.args.length > 1) {
        return [
          `Handle case where 'gt_s' args has more than one element ${obj.args}`,
        ];
      }
      const errorOrNr: string | WASMOpcodeNumber =
        tryToOpcodeOrErrorMsg(opcode);
      if (typeof errorOrNr === 'string') {
        return [errorOrNr];
      }
      op = new WasmInstruction(opcode, errorOrNr);
      break;
    }
    case 'lt_s': {
      const opcode = obj.object + '.lt_s';
      if (obj.args.length > 1) {
        return [
          `Handle case where 'lt_s' args has more than one element ${obj.args}`,
        ];
      }
      op = new WasmInstruction(opcode, WASMOpcodeNumber.I32LTSigned);
      break;
    }
    case 'tee_local': {
      if (obj.args.length > 1) {
        return [
          `Handle case where 'tee_local' args has more than one element ${obj.args}`,
        ];
      }
      op = new WasmInstruction(
        'tee_local',
        WASMOpcodeNumber.Tee_local,
        obj.args[0].value,
      );
      break;
    }
    case 'unreachable':
    case 'current_memory':
    case 'select':
    case 'grow_memory': {
      const opcode = obj.id;
      if (obj.args.length > 0) {
        return [`Handle case where '${opcode}' args is not empty ${obj.args}`];
      }
      const errorOrNr = tryToOpcodeOrErrorMsg(opcode);
      if (typeof errorOrNr === 'string') {
        return [errorOrNr];
      }
      op = new WasmInstruction(opcode, errorOrNr);
      break;
    }
    case 'nop': {
      op = new WasmInstruction('nop', WASMOpcodeNumber.Nop);
      break;
    }
    case 'br_table': {
      const branchTargets = obj.args.map((a: any) => a.value);
      op = new BranchTable(branchTargets);
      break;
    }
    case 'const': {
      const args = obj.args;
      if (!(args instanceof Array) || args.length !== 1) {
        throw new Error(
          `'args' of parsed const instruction is supposed to be an array of size 1. Given ${args}`,
        );
      }
      const parsed = parseConstValue(obj.args[0], obj.object);
      if (typeof parsed === 'string') {
        return [parsed];
      }
      op = parsed;
      break;
    }
    case 'eqz':
    case 'eq':
    case 'ne':
    case 'lt_u':
    case 'gt_u':
    case 'le_s':
    case 'le_u':
    case 'ge_s':
    case 'ge_u':
    case 'clz':
    case 'popctn':
    case 'wrap/i64':
    case 'trunc_s/f32':
    case 'trunc_u/f32':
    case 'trunc_s/f64':
    case 'trunc_u/f64':
    case 'reinterpret/f32':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'abs':
    case 'min':
    case 'max':
    case 'neg':
    case 'copysign':
    case 'ceil':
    case 'floor':
    case 'trunc':
    case 'nearest':
    case 'sqrt':
    case 'lt':
    case 'gt':
    case 'le':
    case 'ge':
    case 'convert_s/i32':
    case 'convert_u/i32':
    case 'convert_s/i64':
    case 'convert_u/i64':
    case 'promote/f32':
    case 'reinterpret/i64':
    case 'load':
    case 'store':
    case 'div_s':
    case 'demote/f64':
    case 'store8':
    case 'reinterpret/f64':
    case 'shr_u':
    case 'and':
    case 'or':
    case 'shl':
    case 'store16':
    case 'xor':
    case 'div_u':
    case 'extend_u/i32':
    case 'extend_s/i32':
    case 'rem_u':
    case 'rem_s':
    case 'load8_u':
    case 'load8_s':
    case 'load16_u':
    case 'load32_u':
    case 'load32_s':
    case 'shr_s':
    case 'rotl':
    case 'rorr':
    case 'ctz': {
      const opcode = obj.object + `.${obj.id}`;
      const errorOrNr: string | WASMOpcodeNumber =
        tryToOpcodeOrErrorMsg(opcode);
      if (typeof errorOrNr === 'string') {
        return [errorOrNr];
      }
      op = new WasmInstruction(opcode, errorOrNr);
      break;
    }
    default: {
      const prefixInstr = obj.object !== undefined ? `${obj.object}.` : '';
      // error msg
      return [`Unsupported Wasm instruction ${prefixInstr}${obj.id}`];
    }
  }

  op.startAddress = obj.loc.start.column;
  op.endAddress = obj.loc.end.column;
  return op;
}

function parseCall(obj: any): CallInstruction {
  if (obj.index === undefined) {
    throw new Error(
      `Call instruction has no expected 'index' field got ${obj}`,
    );
  }

  let funName = '';
  let funID = -1;
  switch (obj.index.type) {
    case 'NumberLiteral': {
      if (typeof obj.index.value !== 'number') {
        throw new Error(
          `obj index value is supposed to be a number when type is 'NumberLiteral' got ${obj.type.value}`,
        );
      }
      funID = obj.index.value;
      break;
    }
    case 'Identifier': {
      if (typeof obj.index.value !== 'string') {
        throw new Error(
          `obj index 'value' field is supposed to be a string. Got ${obj.index.value}`,
        );
      }
      funName = obj.index.value;
      break;
    }
    default: {
      throw new Error(
        `obj index 'type' is of unhandled type. Got ${obj.index.type}`,
      );
    }
  }

  if (funID === -1) {
    // above changed the funName
    if (
      typeof obj.numeric !== 'object' ||
      obj.numeric.type !== 'NumberLiteral' ||
      obj.numeric.value === undefined ||
      typeof obj.numeric.value !== 'number'
    ) {
      throw new Error(
        `The fun ID is expected to be stored in a numeric object of type 'NumberLiteral' got ${obj.numeric}`,
      );
    }

    funID = obj.numeric.value;
  } else {
    // above changed the funID
    // there is no function name so lets produce it
    const expectedFields = new Set<string>(['loc', 'index', 'id', 'type']);
    const fields = Object.keys(obj);
    for (const f of fields) {
      if (!expectedFields.has(f)) {
        throw new Error(
          `encountered a field that may give info on fun name ${f} from obj ${JSON.stringify(obj)}`,
        );
      }
    }
    funName = `func_${funID}`;
  }
  return new CallInstruction(funName, funID);
}

function parseConstValue(valueObj: any, vtype: string): ConstInstr | string {
  const allowedTypes = ['i32', 'u32', 'f32', 'f64', 'i64'];
  if (allowedTypes.find((t) => t === vtype) === undefined) {
    return `The provided value type '${vtype}' does not match expected types: [${allowedTypes.join(
      ', ',
    )}]`;
  }
  switch (valueObj.type) {
    case 'NumberLiteral':
      if (typeof valueObj.value !== 'number') {
        return `'value' field of parsed I32Const should be a number. Found: ${valueObj.value}`;
      }
      return new ConstInstr(WASMOpcodeNumber.I32Const, valueObj.value);
    case 'LongNumberLiteral': {
      const value = valueObj.value;
      if (typeof value !== 'object') {
        return `'value' field of parsed I64Const should be an object`;
      }

      const low = value.low;
      const high = value.high;
      if (typeof low !== 'number' || typeof high !== 'number') {
        return `'low' and 'high' fields of parsed I64Const Instr should be numbers. Given low ${low} and high ${high}`;
      }

      return new ConstInstr(WASMOpcodeNumber.I64Const, low, high);
    }
    case 'FloatLiteral': {
      const value = valueObj.value;
      if (typeof value !== 'number') {
        return `'value' of parsed ${vtype} is expected to be an number. Given ${value}`;
      }
      const op =
        vtype === 'f32' ? WASMOpcodeNumber.F32Const : WASMOpcodeNumber.F64Const;
      return new ConstInstr(op, value);
    }
    default:
      return `Expected I32,I64,F32, or F64 opcode`;
  }
}

export function parseWasmModule(wasmPath: string): [ParsedModule, string[]] {
  const binary = readFileSync(wasmPath);
  const decoderOpts = {};
  try {
    const ast = decode.decode(binary, decoderOpts);
    if (ast.body.length > 1) {
      logger.info(`Encountered more than one module only parsing the first`);
    }

    const mod = ast.body[0];
    const metadata = mod.metadata;
    const [sections, sectionErrors] = parseSections(metadata.sections);
    const localsNames = parseLocalNames(metadata.localNames);
    const exportedFuncs = parseExportFuncs(mod.fields);
    const funcNames = parseFunctionNames(metadata.functionNames);
    const types = parseTypes(mod.fields);
    const [funcs, funErrors] = parseFuncFields(mod.fields);
    const funcImports = parseFuncImports(mod.fields);
    const tableImports = parseTableImports(mod.fields);
    const elements = parseElements(mod.fields);
    const [globals, globalsErrs] = parseGlobals(mod.fields);
    // TODO fiels 'Table', 'Memory'. 'Elem', 'ModuleExport'
    const parsedMod = {
      localsNames,
      exportedFuncs,
      funcNames,
      types,
      funcs,
      funcImports,
      tableImports,
      elements,
      globals,
      ast: mod,
      sections,
      wasmBuffer: binary,
    };

    const errors = sectionErrors.concat(funErrors, globalsErrs);
    return [parsedMod, errors];
  } catch (e) {
    if (e instanceof Error) {
      const msg = e.message;
      if (typeof msg === 'string') {
        const reg = /Unexpected instruction: (0x[a-fA-F0-9]+)/;
        const matched = msg.match(reg);
        if (matched === undefined || matched === null) {
          throw e;
        }

        const opcode = Number(matched[1]);
        if (isNaN(opcode)) {
          throw e;
        }
        if (!IsOpcodeWasmVersion1(opcode)) {
          throw new Error(
            `Wasm failed to parse Wasm version1 is expected: ${msg}`,
          );
        }
        throw e;
      } else {
        throw e;
      }
    } else {
      throw e;
    }
  }
}

function parseFuncImport(obj: any): ModuleFuncImport {
  if (
    typeof obj !== 'object' ||
    typeof obj.name !== 'string' ||
    typeof obj.module !== 'string'
  ) {
    throw new Error(`Obj expected to satisfy ModuleFuncImport Interface`);
  }

  const loc = obj.loc;
  assertWasmSourceCodeLocation(loc);
  return {
    module: obj.module,
    name: obj.name,
    descr: parseFuncImportDescription(obj.descr),
    loc,
  };
}

function parseFuncImportDescription(obj: any): ModuleFuncImportDescription {
  if (typeof obj !== 'object' || typeof obj.type !== 'string') {
    throw new Error(
      `Obj expected to satisfy ModuleImportDescription Interface`,
    );
  }
  if (obj.type !== ImportType.FuncImport) {
    throw new Error(
      `parsing a ModuleDescription of unexpected structure ${JSON.stringify(obj)}`,
    );
  }

  let id = '';
  if (typeof obj.id === 'string') {
    // e.g., id= "func_0"
    id = obj.id;
  } else if (typeof obj.id === 'object') {
    // e.g., id: {
    //       type: "Identifier",
    //       value: "chip_pin_mode",
    //     },
    const objId = obj.id;
    if (objId.type !== 'Identifier' || typeof objId.value !== 'string') {
      throw new Error(
        `id of ModuleDescription has an unexpected structure ${JSON.stringify(obj)}`,
      );
    }
    id = objId.value;
  } else {
    throw new Error(
      `id of ModuleDescription has an unhandled structure ${JSON.stringify(obj)}`,
    );
  }

  const signature = obj.signature;
  assertFuncSignature(signature);

  return {
    type: obj.type,
    id,
    signature,
  };
}

function isImport(obj: any): boolean {
  if (obj.type !== 'ModuleImport') {
    return false;
  }
  if (
    obj.descr === undefined ||
    obj.descr.type === undefined ||
    typeof obj.descr.type !== 'string'
  ) {
    return false;
  }
  return true;
}

function isFunctionImport(obj: any): boolean {
  return isImport(obj) && obj.descr.type === ImportType.FuncImport;
}

function parseFuncImports(fields: any): ModuleFuncImport[] {
  const importFields: any[] = fields.filter(isFunctionImport);
  return importFields
    .map((i) => {
      return parseFuncImport(i);
    })
    .sort((a, b) => {
      return a.loc.start.column - b.loc.start.column;
    });
}
/**
 * Exported content
 */

enum ExportType {
  Func = 'Func',
}

export interface FunExport {
  name: string;
  id?: number;
}

function isExportField(obj: any): boolean {
  return (
    typeof obj === 'object' &&
    obj.type === 'ModuleExport' &&
    typeof obj.descr === 'object'
  );
}

function validExportFuncField(obj: any): boolean {
  return isExportField(obj) && obj.descr.exportType === ExportType.Func;
}

function parseExportFuncs(fields: any): FunExport[] {
  const exports: FunExport[] = [];
  for (const f of fields) {
    if (validExportFuncField(f)) {
      if (f.name === undefined || typeof f.name !== 'string') {
        throw new Error(
          `Found a case where the name is missing or is not a string in export field ${f}`,
        );
      }
      let id: number | undefined;
      if (f.descr.id.type === 'NumberLiteral') {
        id = f.descr.id.value;
      }

      const ef: FunExport = {
        name: f.name,
        id,
      };
      exports.push(ef);
    }
  }
  return exports;
}

function validExportFuncField(obj: any): boolean {
  return (
    typeof obj === 'object' &&
    obj.type === 'ModuleExport' &&
    typeof obj.descr === 'object' &&
    obj.descr.exportType === 'Func'
  );
}

function parseTableImportDescription(obj: any): ModuleTableImportDescription {
  // an example of description is
  //  {
  //   type: "Table",
  //   elementType: "anyfunc",
  //   limits: {
  //     type: "Limit",
  //     min: 1,
  //   },
  //   name: {
  //     type: "Identifier",
  //     value: "table_0",
  //     raw: "1",
  //   },
  // }

  if (
    obj.type !== 'Table' ||
    typeof obj.name !== 'object' ||
    obj.name.type !== 'Identifier' ||
    typeof obj.name.value !== 'string'
  ) {
    throw new Error(`TalbeDescription does not satisfy interface`);
  }

  const value = obj.name.value;
  const reg = /^table_([0-9]+)$/;

  const matched = value.match(reg);
  if (matched === undefined || matched === null) {
    throw new Error(
      `Could not derive id for imported table. Description is ${JSON.stringify(obj.value)}`,
    );
  }
  const id = Number(matched[1]);
  if (isNaN(id)) {
    throw new Error(
      `The derived id for imported table using '${value}' could not be converted to a number. Description is ${JSON.stringify(obj.value)}`,
    );
  }
  return { type: obj.type, value, id };
}

function isTableImport(obj: any): boolean {
  return isImport(obj) && obj.descr.type === ImportType.TableImport;
}

function parseTableImport(obj: any): ModuleTableImport {
  if (
    typeof obj !== 'object' ||
    typeof obj.name !== 'string' ||
    typeof obj.type !== 'string' ||
    typeof obj.module !== 'string' ||
    typeof obj.descr !== 'object' ||
    typeof obj.loc !== 'object' ||
    obj.name !== 'table' ||
    obj.type !== 'ModuleImport'
  ) {
    throw new Error(`obj does not satisfy Table import interface`);
  }

  const loc = obj.loc;
  assertWasmSourceCodeLocation(loc);
  return {
    module: obj.module,
    name: obj.name,
    descr: parseTableImportDescription(obj.descr),
    loc,
  };
}

function parseTableImports(fields: any): ModuleTableImport[] {
  const importFields: any[] = fields.filter(isTableImport);
  return importFields
    .map((i) => {
      return parseTableImport(i);
    })
    .sort((a, b) => {
      return a.loc.start.column - b.loc.start.column;
    });
}

export interface ModuleElement {
  type: string;
  tableId: number;
  funcs: number[];
  loc: WasmSourceLocation;
}

function parseElements(fields: any): ModuleElement[] {
  // example of Element field
  // {
  //   type: "Elem",
  //   table: {
  //     type: "NumberLiteral",
  //     value: 0,
  //     raw: "0",
  //   },
  //   offset: [
  //     {
  //       type: "Instr",
  //       id: "const",
  //       args: [
  //         {
  //           type: "NumberLiteral",
  //           value: 0,
  //           raw: "0",
  //         },
  //       ],
  //       object: "i32",
  //       loc: {
  //         start: {
  //           line: -1,
  //           column: 69,
  //         },
  //         end: {
  //           line: -1,
  //           column: 71,
  //         },
  //       },
  //     },
  //     {
  //       type: "Instr",
  //       id: "end",
  //       args: [
  //       ],
  //       loc: {
  //         start: {
  //           line: -1,
  //           column: 71,
  //         },
  //         end: {
  //           line: -1,
  //           column: 72,
  //         },
  //       },
  //     },
  //   ],
  //   funcs: [
  //     {
  //       type: "NumberLiteral",
  //       value: 2,
  //       raw: "2",
  //     },
  //   ],
  //   loc: {
  //     start: {
  //       line: -1,
  //       column: 68,
  //     },
  //     end: {
  //       line: -1,
  //       column: 74,
  //     },
  //   },
  // }
  const elements: ModuleElement[] = [];
  for (const field of fields) {
    if (typeof field !== 'object' || field.type !== 'Elem') {
      continue;
    }

    if (
      typeof field.table !== 'object' ||
      field.table.type !== 'NumberLiteral' ||
      typeof field.table.value !== 'number'
    ) {
      throw new Error(
        `Element does not have table field or not the right type: ${JSON.stringify(field)}`,
      );
    }

    const loc = field.loc;
    assertWasmSourceCodeLocation(loc);

    const tblIndex = field.table.value;

    let funcs: any[] = [];
    if (Array.isArray(field.funcs)) {
      funcs = field.funcs;
    }

    const funcsIDs: number[] = [];
    for (let i = 0; i < funcs.length; i++) {
      const f = funcs[i];
      if (
        typeof f !== 'object' ||
        f.type !== 'NumberLiteral' ||
        typeof f.value !== 'number'
      ) {
        throw new Error(
          `Func of element does not have expected interface: ${JSON.stringify(f)}`,
        );
      }
      funcsIDs.push(f.value);
    }
    elements.push({
      type: field.type,
      tableId: tblIndex,
      funcs: funcsIDs,
      loc,
    });
  }
  return elements.sort((a, b) => {
    return a.loc.start.column - b.loc.start.column;
  });
}

function assertGlobalType(obj: any): asserts obj is GlobalType {
  if (
    typeof obj !== 'object' ||
    obj.type !== 'GlobalType' ||
    typeof obj.mutability !== 'string' ||
    typeof obj.valtype !== 'string'
  ) {
    throw new Error(`Obj expected to satisfy GlobalType Interface`);
  }
}

function assertWasmGlobal(obj: any): [ParsedGlobal | undefined, string[]] {
  const name = obj.name;
  if (
    typeof obj !== 'object' ||
    obj.type !== 'Global' ||
    (name !== undefined && typeof name !== 'string')
  ) {
    return [undefined, [`Obj expected to satisfy WasmGlobal Interface`]];
  }

  if (!Array.isArray(obj.init)) {
    return [
      undefined,
      [`Obj.init expected to be an array to satisfy WasmGlobal Interface`],
    ];
  }
  const parsedInit: Array<WasmInstruction | string[] | undefined> =
    obj.init.map((i: any) => {
      return parseInstruction(i);
    });

  const init: WasmInstruction[] = [];
  let errors: string[] = [];
  for (const v of parsedInit) {
    if (v instanceof WasmInstruction) {
      init.push(v);
    } else if (v instanceof Array) {
      errors = errors.concat(v);
    }
  }
  const loc = obj.loc;
  assertWasmSourceCodeLocation(loc);
  const globalType = obj.globalType;
  assertGlobalType(globalType);

  return [
    {
      type: 'Global',
      loc,
      name,
      globalType,
      init,
    },
    errors,
  ];
}

function parseGlobals(fields: any): [ParsedGlobal[], string[]] {
  const globalFields: any[] = fields.filter((f: any) => {
    return f.type === 'Global';
  });

  const parsedGlobals = globalFields.map((g) => {
    return assertWasmGlobal(g);
  });

  const glbs: ParsedGlobal[] = [];
  const errors: string[] = [];
  for (const [g, errs] of parsedGlobals) {
    if (g !== undefined) {
      glbs.push(g);
    }

    if (errs.length > 0) {
      errs.forEach((e) => errors.push(e));
    }
  }
  glbs.sort((a, b) => {
    return a.loc.start.column - b.loc.start.column;
  });
  return [glbs, errors];
}

function parseLocalNames(localNames: any): LocalName[] {
  if (localNames === undefined) {
    logger.debug(`No local names for module`);
    return [];
  }
  const locals: LocalName[] = localNames.map((n: any) => {
    if (n.type !== 'LocalNameMetadata') {
      logger.warn(`encountered a localName of unexpected type ${n.type}`);
    }
    const l: LocalName = {
      type: n.type,
      value: n.value,
      localIndex: n.localIndex,
      functionIndex: n.functionIndex,
    };
    return l;
  });
  return locals;
}

function parseFunctionNames(functionNames: any): MetaDataFunctionName[] {
  if (functionNames === undefined) {
    logger.debug(`No function names for module`);
    return [];
  }
  const funcs: MetaDataFunctionName[] = functionNames.map((n: any) => {
    if (n.type !== 'FunctionNameMetadata') {
      logger.warn(`encountered a functionName of unexpected type ${n.type}`);
    }
    const f: MetaDataFunctionName = {
      type: n.type,
      value: n.value,
      index: n.index,
    };
    return f;
  });
  return funcs;
}
function parseSections(sections: any): [Section[], string[]] {
  if (!Array.isArray(sections)) {
    return [[], [`Obj's sections field is not an array`]];
  }

  const errors: string[] = [];
  const sects: Section[] = [];
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    let sectionType: SectionType | undefined;
    let valid = true;
    switch (sec.section) {
      case 'type':
        sectionType = SectionType.Type;
        break;
      case 'import':
        sectionType = SectionType.Import;
        break;
      case 'func':
        sectionType = SectionType.Function;
        break;
      case 'table':
        sectionType = SectionType.Table;
        break;
      case 'memory':
        sectionType = SectionType.Memory;
        break;
      case 'global':
        sectionType = SectionType.Global;
        break;
      case 'export':
        sectionType = SectionType.Export;
        break;
      case 'element':
        sectionType = SectionType.Element;
        break;
      case 'code':
        sectionType = SectionType.Code;
        break;
      case 'custom':
        sectionType = SectionType.Custom;
        break;
      case 'data':
        sectionType = SectionType.Data;
        break;
      case 'start':
        sectionType = SectionType.Start;
        break;
      default:
        valid = false;
        errors.push(`Cannot parse unsupported section ${sec.section}`);
        break;
    }
    if (valid && sectionType !== undefined) {
      const loc = sec.size.loc;
      assertWasmSourceCodeLocation(loc);
      sects.push({
        type: sectionType,
        startAddress: loc.start.column,
        sectionSize: sec.size.value,
        endAddress: loc.end.column,
      });
    }
  }

  return [sects, errors];
}

function checkValType(obj: any): obj is ValType {
  if (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'valtype' in obj &&
    (typeof obj.id === 'undefined' || typeof obj.id === 'string') &&
    typeof obj.valtype === 'string'
  ) {
    return true;
  } else {
    throw new Error('Object does not satisfy the ValType interface');
  }
}

function checkFuncTypeOfInstructionType(
  obj: any,
): obj is FuncTypeOfInstructionType {
  if (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'params' in obj &&
    'results' in obj &&
    typeof obj.type === 'string' &&
    Array.isArray(obj.params) &&
    Array.isArray(obj.results)
  ) {
    for (let i = 0; i < obj.params.length; i++) {
      checkValType(obj.params[i]);
    }
    for (let i = 0; i < obj.results.length; i++) {
      if (typeof obj.results[i] !== 'string') {
        throw new Error(
          'Object does not satisfy the FuncType interface for results',
        );
      }
    }
    return true;
  } else {
    throw new Error('Object does not satisfy the FuncType interface');
  }
}

function assertLoc(obj: any): obj is Location {
  if (
    typeof obj === 'object' &&
    obj !== null &&
    'line' in obj &&
    'column' in obj &&
    typeof obj.line === 'number' &&
    typeof obj.column === 'number'
  ) {
    return true;
  } else {
    throw new Error('Object does not satisfy the Loc interface');
  }
}

function assertWasmSourceCodeLocation(
  obj: any,
): asserts obj is WasmSourceLocation {
  if (
    typeof obj !== 'object' ||
    obj.start === undefined ||
    obj.end === undefined
  ) {
    throw new Error('Object does not satisfy the FullLocation interface');
  }

  assertLoc(obj.start);
  assertLoc(obj.end);
}

function parseTypes(fields: any): WasmType[] {
  const typeFields: any[] = fields.filter((f: any) => {
    return f.type === 'TypeInstruction';
  });

  const locationsAndTypes: Array<
    [WasmSourceLocation, FuncTypeOfInstructionType]
  > = typeFields.map((tf: any) => {
    const funcType = tf.functype;
    checkFuncTypeOfInstructionType(funcType);
    const loc = tf.loc;
    assertWasmSourceCodeLocation(loc);
    return [loc, funcType];
  });

  locationsAndTypes.sort(([l1, _t1], [l2, _t2]) => {
    return l1.start.column - l2.start.column;
  });
  return locationsAndTypes.map((a, typeId) => {
    const funcType = a[1];
    return parseWasmType(funcType, typeId);
  });
}

function parseWasmType(obj: any, typeId?: number): WasmType {
  if (obj.params === undefined || obj.results === undefined) {
    throw new Error(
      `Wasm Type is expected to have params or results as fields`,
    );
  }

  const ps: WASM.Type[] = [];
  const rs: WASM.Type[] = [];

  for (const v of obj.params) {
    if (typeof v !== 'object') {
      throw new Error(
        `Wasm Type of parameter ${v} is expected to be an object`,
      );
    }

    const valtype = v.valtype;
    if (typeof valtype !== 'string') {
      throw new Error(
        `valtype of parameter ${v} is expected to be a string now it is ${valtype}`,
      );
    }

    const t = WASM.typing.get(valtype.trim().toLowerCase());
    if (t === undefined) {
      throw new Error(`No Wasm Type found for parameter ${v}`);
    }
    ps.push(t);
  }

  for (const v of obj.results) {
    if (typeof v !== 'string') {
      throw new Error(`result type ${v} is expected to be a string`);
    }

    const t = WASM.typing.get(v.trim().toLowerCase());
    if (t === undefined) {
      throw new Error(`No Wasm Type found for results ${v}`);
    }
    rs.push(t);
  }

  const wasmType = new WasmType(ps.length, rs.length, typeId);
  wasmType.args = ps;
  wasmType.returnTypes = rs;
  return wasmType;
}

function parseFuncFields(fields: any): [Func[], string[]] {
  const funcFields: any[] = fields.filter((f: any) => {
    return f.type === 'Func';
  });
  if (funcFields.length === 0) {
    return [[], ['No function Fields found during parsingFuncFields call']];
  }

  const parsedFuncs: Array<[Func | undefined, string[]]> = funcFields.map(
    (ff) => {
      return parseFunc(ff);
    },
  );

  const funcs: Func[] = [];
  let errors: string[] = [];
  for (const [f, errs] of parsedFuncs) {
    if (errs.length > 0) {
      errors = errors.concat(errs);
    }
    if (f !== undefined) {
      funcs.push(f);
    }
  }

  return [funcs, errors];
}
