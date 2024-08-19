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
  funcNames: MetaDataFunctionName[];
  types: WasmType[];
  funcs: Func[];
  imports: ModuleImport[];
  globals: ParsedGlobal[];
  sections: Section[];
  ast: any;
  wasmBuffer: Buffer;
}

interface Func {
  type: 'Func';
  name: FuncName;
  signature: FuncSignature;
  body: WasmInstruction[];
  bodySize: number;
}

export interface ModuleImportID {
  type: string;
  value: string;
}

export interface ModuleImportDescription {
  type: string;
  id: ModuleImportID;
  signature: FuncSignature;
}

export interface ModuleImport {
  module: string;
  name: string;
  descr: ModuleImportDescription;
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

  const signature = obj.signature;
  assertFuncSignature(signature);

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
      op = new CallInstruction(obj.index.value, obj.numeric.value);
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
      const opcode = obj.object + `.${obj.id}`;
      const errorOrNr: string | WASMOpcodeNumber =
        tryToOpcodeOrErrorMsg(opcode);
      if (typeof errorOrNr === 'string') {
        return [errorOrNr];
      }

      const args = obj.args;
      if (!(args instanceof Array) || args.length !== 1) {
        throw new Error(
          `'args' of parsed const instruction is supposed to be an array of size 1. Given ${args}`,
        );
      }
      const vObj = args[0];
      if (vObj.type !== 'NumberLiteral') {
        throw new Error(
          `type of parsed const should be 'NumberLiterial' given ${vObj.type}`,
        );
      }

      const v = vObj.value;
      if (v === undefined || typeof v !== 'number') {
        throw new Error(
          `The value of the parsed const instruction is supposed to be an number. Give ${vObj.value}`,
        );
      }
      op = new ConstInstr(errorOrNr, v);
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
    const funcNames = parseFunctionNames(metadata.functionNames);
    const types = parseTypes(mod.fields);
    const [funcs, funErrors] = parseFuncFields(mod.fields);
    const imports = parseImports(mod.fields);
    const [globals, globalsErrs] = parseGlobals(mod.fields);
    // TODO fiels 'Table', 'Memory'. 'Elem', 'ModuleExport'
    const parsedMod = {
      localsNames,
      funcNames,
      types,
      funcs,
      imports,
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

        const MAX_OPCODE_WASM_VERS1 = 0xbf;
        const opcode = Number(matched[1]);
        if (isNaN(opcode) || opcode <= MAX_OPCODE_WASM_VERS1) {
          throw e;
        }
        throw new Error(
          `Wasm failed to parse Wasm version1 is expected: ${msg}`,
        );
      } else {
        throw e;
      }
    } else {
      throw e;
    }
  }
}

function assertModuleImport(obj: any): asserts obj is ModuleImport {
  if (
    typeof obj !== 'object' ||
    typeof obj.name !== 'string' ||
    typeof obj.module !== 'string'
  ) {
    throw new Error(`Obj expected to satisfy ModuleImport Interface`);
  }
  assertModuleDescription(obj.descr);
  assertWasmSourceCodeLocation(obj.loc);
}

function assertModuleDescription(
  obj: any,
): asserts obj is ModuleImportDescription {
  if (typeof obj !== 'object' || typeof obj.type !== 'string') {
    throw new Error(
      `Obj expected to satisfy ModuleImportDescription Interface`,
    );
  }
  assertModuleImportID(obj.id);
  assertFuncSignature(obj.signature);
}

function assertModuleImportID(obj: any): asserts obj is ModuleImportID {
  if (
    typeof obj !== 'object' ||
    typeof obj.type !== 'string' ||
    typeof obj.value !== 'string'
  ) {
    throw new Error(`Obj expected to satisfy ModuleImportID Interface`);
  }
}

function parseImports(fields: any): ModuleImport[] {
  const importFields: any[] = fields.filter((f: any) => {
    return f.type === 'ModuleImport';
  });
  return importFields
    .map((i) => {
      assertModuleImport(i);
      return i;
    })
    .sort((a, b) => {
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
