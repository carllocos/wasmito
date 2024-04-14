import { readFileSync } from 'fs';
import { createLogger } from '../../logger/logger';
import { WasmType } from '../../state/opcode_type';
import {
  BlockInstruction,
  CallInstruction,
  IfInstruction,
  LoopInstruction,
  WasmInstruction,
} from './wasm_instruction';
import { WASM } from '../../state/wasm';
import { WASMOpcodeNumber, wasmOpcodeFromStr } from './wasm_opcode';
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

function parseFunc(obj: any): Func {
  if (typeof obj !== 'object') {
    throw new Error('ParseFunc exepcts object');
  }

  const type = obj.type;
  if (typeof type !== 'string' || type !== 'Func') {
    throw new Error('object does not have Func Interface');
  }
  if (
    typeof obj.metadata !== 'object' ||
    typeof obj.metadata.bodySize !== 'number'
  ) {
    throw new Error('object does not have Func Interface');
  }

  const name = obj.name;
  checkFuncName(name);

  const signature = obj.signature;
  assertFuncSignature(signature);

  let body = obj.body;
  if (!Array.isArray(body)) {
    throw new Error('Func Body is expected to be an array of Instructions');
  }
  body = body
    .map((inst) => {
      return parseInstruction(inst);
    })
    .filter((i) => i !== undefined);

  return {
    type,
    name,
    signature,
    body,
    bodySize: obj.metadata.bodySize,
  };
}

function checkFuncName(obj: any): asserts obj is FuncName {
  if (
    typeof obj !== 'object' ||
    typeof obj.type !== 'string' ||
    typeof obj.value !== 'string' ||
    typeof obj.numeric !== 'string'
  ) {
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

function parseInstruction(obj: any): WasmInstruction | undefined {
  if (
    typeof obj !== 'object' ||
    typeof obj.type !== 'string' ||
    typeof obj.id !== 'string'
  ) {
    throw new Error(`obj doest not satisfy the WasmInstruction Interface`);
  }
  let op: WasmInstruction | undefined;
  switch (obj.id) {
    case 'unreachable': {
      const args = obj.args;
      if (args.length > 0) {
        throw new Error(`Handle case where args is not zero length ${args}`);
      }
      op = new WasmInstruction('unreachable', WASMOpcodeNumber.Unreachable);
      break;
    }
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
    case 'end': {
      if (!Array.isArray(obj.args)) {
        throw new Error('Invalid end isntruction');
      }
      const labels = obj.args.map((a: any) => {
        assertInstructionArg(a);
        return a.value;
      });
      op = new WasmInstruction('end', WASMOpcodeNumber.End);
      op.args = labels;
      break;
    }
    case 'const': {
      const opName = obj.object + '.const';
      op = new WasmInstruction(opName, wasmOpcodeFromStr(opName));
      break;
    }
    case 'get_global': {
      if (obj.args.length > 1) {
        throw new Error(
          `Handle case where args has more than one element ${obj.args}`,
        );
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
        throw new Error(
          `Handle case where args has more than one element ${obj.args}`,
        );
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
    case 'sub': {
      const opcode = obj.object + '.sub';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'div': {
      const opcode = obj.object + '.div';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'convert_s/i32': {
      const opcode = obj.object + '.convert_s/i32';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'mul': {
      const opcode = obj.object + '.mul';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'add': {
      const opName = obj.object + '.add';
      op = new WasmInstruction(opName, wasmOpcodeFromStr(opName));
      break;
    }
    case 'trunc_s/f32': {
      const opcode = obj.object + '.trunc_s/f32';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'return': {
      op = new WasmInstruction('return', WASMOpcodeNumber.Return);
      break;
    }
    case 'block': {
      const label = obj.label.value;
      const opcodes: WasmInstruction[] = obj.instr
        .map((o: any) => {
          return parseInstruction(o);
        })
        .filter((i: WasmInstruction | undefined) => i !== undefined);
      op = new BlockInstruction(label, opcodes);
      break;
    }
    case 'loop': {
      const label = obj.label.value;
      const opcodes: WasmInstruction[] = obj.instr
        .map((o: any) => {
          return parseInstruction(o);
        })
        .filter((i: WasmInstruction | undefined) => i !== undefined);
      if (obj.resulttype !== null) {
        logger.error(`Account for resulttype field`);
        throw new Error(`Account for the resulttype ${obj.resulttype}`);
      }
      op = new LoopInstruction(label, opcodes, obj.resultType);
      break;
    }
    case 'if': {
      const label = obj.testLabel.value;
      let result: WASM.Type | undefined;
      if (obj.result !== null) {
        result = WASM.typing.get(obj.result);
        if (result === undefined) {
          throw new Error(
            `If expression returns an unsupported type ${obj.result}`,
          );
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
        throw new Error(
          `Handle case where args has more than one element ${obj.args}`,
        );
      }
      op = new WasmInstruction('br', WASMOpcodeNumber.Br, obj.args[0].value);
      break;
    }
    case 'gt_s': {
      const opcode = obj.object + '.gt_s';
      if (obj.args.length > 1) {
        throw new Error(
          `Handle case where args has more than one element ${obj.args}`,
        );
      }
      op = new WasmInstruction(opcode, WASMOpcodeNumber.GTSigned);
      break;
    }
    case 'lt_s': {
      const opcode = obj.object + '.lt_s';
      if (obj.args.length > 1) {
        throw new Error(
          `Handle case where args has more than one element ${obj.args}`,
        );
      }
      op = new WasmInstruction(opcode, WASMOpcodeNumber.I32LTSigned);
      break;
    }
    case 'abs': {
      const opcode = obj.object + '.abs';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'ne': {
      const opcode = obj.object + '.ne';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'eq': {
      const opcode = obj.object + '.eq';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'eqz': {
      const opcode = obj.object + '.eqz';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'trunc': {
      const opcode = obj.object + '.trunc';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'copysign': {
      const opcode = obj.object + '.copysign';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'reinterpret/f64': {
      const opcode = obj.object + '.reinterpret/f64';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'reinterpret/i64': {
      const opcode = obj.object + '.reinterpret/i64';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'shr_u': {
      const opcode = obj.object + '.shr_u';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'and': {
      const opcode = obj.object + '.and';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'or': {
      const opcode = obj.object + '.or';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'shl': {
      const opcode = obj.object + '.shl';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'le_u': {
      const opcode = obj.object + '.le_u';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'ge_u': {
      const opcode = obj.object + '.ge_u';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'clz': {
      const opcode = obj.object + '.clz';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'convert_u/i32': {
      const opcode = obj.object + '.convert_u/i32';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'lt': {
      const opcode = obj.object + '.lt';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'gt': {
      const opcode = obj.object + '.gt';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'demote/f64': {
      const opcode = obj.object + '.demote/f64';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'store': {
      const opcode = obj.object + '.store';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    case 'store8': {
      const opcode = obj.object + '.store8';
      op = new WasmInstruction(opcode, wasmOpcodeFromStr(opcode));
      break;
    }
    default:
      throw new Error(`Unsupported Wasm instruction ${obj.id}`);
  }
  op.startAddress = obj.loc.start.column;
  op.endAddress = obj.loc.end.column;
  return op;
}

export function parseWasmModule(wasmPath: string): ParsedModule {
  const binary = readFileSync(wasmPath);
  const decoderOpts = {};
  const ast = decode.decode(binary, decoderOpts);
  if (ast.body.length > 1) {
    logger.info(`Encountered more than one module only parsing the first`);
  }

  const mod = ast.body[0];
  const metadata = mod.metadata;
  const sections = parseSections(metadata.sections);
  const localsNames = parseLocalNames(metadata.localNames);
  const funcNames = parseFunctionNames(metadata.functionNames);
  const types = parseTypes(mod.fields);
  const funcs = parseFuncFields(mod.fields);
  const imports = parseImports(mod.fields);
  const globals = parseGlobals(mod.fields);
  // TODO fiels 'Table', 'Memory'. 'Elem', 'ModuleExport'
  return {
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

function assertWasmGlobal(obj: any): ParsedGlobal {
  const name = obj.name;
  if (
    typeof obj !== 'object' ||
    obj.type !== 'Global' ||
    (name !== undefined && typeof name !== 'string')
  ) {
    throw new Error(`Obj expected to satisfy WasmGlobal Interface`);
  }

  if (!Array.isArray(obj.init)) {
    throw new Error(
      `Obj.init expected to be an array to satisfy WasmGlobal Interface`,
    );
  }
  const init: WasmInstruction[] = obj.init
    .map((i: any) => {
      return parseInstruction(i);
    })
    .filter((i: WasmInstruction | undefined) => i !== undefined);
  const loc = obj.loc;
  assertWasmSourceCodeLocation(loc);
  const globalType = obj.globalType;
  assertGlobalType(globalType);

  return {
    type: 'Global',
    loc,
    name,
    globalType,
    init,
  };
}

function parseGlobals(fields: any): ParsedGlobal[] {
  const globalFields: any[] = fields.filter((f: any) => {
    return f.type === 'Global';
  });

  return globalFields
    .map((g) => {
      return assertWasmGlobal(g);
    })
    .sort((a, b) => {
      return a.loc.start.column - b.loc.start.column;
    });
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
function parseSections(sections: any): Section[] {
  if (!Array.isArray(sections)) {
    throw new Error(`Obj expected to satisfy Section Interface`);
  }

  // export interface Section {
  //   type: SectionType;
  //   startAddress: number;
  //   endAddress: number;
  //   sectionSize: number;
  // }
  const sects: Section[] = [];
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    let sectionType: SectionType | undefined;
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
      default:
        throw new Error(`Cannot parse unsupported section ${sec.section}`);
    }
    const loc = sec.size.loc;
    assertWasmSourceCodeLocation(loc);
    sects.push({
      type: sectionType,
      startAddress: loc.start.column,
      sectionSize: sec.size.value,
      endAddress: loc.end.column,
    });
  }

  return sects;
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
    return new WasmType(
      funcType.params.length,
      funcType.results.length,
      typeId,
    );
  });
}

function parseFuncFields(fields: any): Func[] {
  const funcFields: any[] = fields.filter((f: any) => {
    return f.type === 'Func';
  });
  if (funcFields.length === 0) {
    throw new Error('No function Fields found');
  }

  return funcFields.map((ff) => {
    return parseFunc(ff);
  });
}
