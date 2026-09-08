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
  GlobalGetInstruction,
  GlobalSetInstruction,
  IfInstruction,
  LoadInstruction,
  LoopInstruction,
  ReturnBranch,
  StoreInstruction,
  WasmInstruction,
} from '../wasm/wasm_instruction';
import { WASM } from '../wasm';
import { wasmOpcodeFromNr, WasmCode } from '../wasm/wasm_opcode';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rustParser = require('wasm-parser');
const logger = createLogger('WasmParserRust');

interface RustInstrJson {
  kind: string;
  opcode: number;
  subOpcode?: number;
  start: number;
  end: number;
  index?: number;
  funcIndex?: number;
  funcName?: string;
  typeIndex?: number;
  offset?: number;
  target?: number;
  targets?: number[];
  i32Value?: number;
  i64Low?: number;
  i64High?: number;
  f32Value?: number;
  f64Value?: number;
  resultType?: string;
  label?: string;
  body?: RustInstrJson[];
  consequence?: RustInstrJson[];
  alternative?: RustInstrJson[];
}

interface RustSectionJson {
  section: string;
  startAddress: number;
  endAddress: number;
}

interface RustFuncTypeJson {
  id: number;
  params: string[];
  results: string[];
}

interface RustFuncImportJson {
  module: string;
  name: string;
  typeIndex: number;
  startAddress: number;
  endAddress: number;
}

interface RustTableImportJson {
  module: string;
  name: string;
  id: number;
  startAddress: number;
  endAddress: number;
}

interface RustLocalJson {
  index: number;
  type: string;
}

interface RustFuncJson {
  id: number;
  name: string;
  typeIndex: number;
  locals: RustLocalJson[];
  body: RustInstrJson[];
}

interface RustGlobalJson {
  valueType: string;
  mutable: boolean;
  name?: string;
  init: RustInstrJson[];
  startAddress: number;
  endAddress: number;
}

interface RustFuncExportJson {
  name: string;
  funcIndex: number;
}

interface RustTableExportJson {
  name: string;
  id: number;
}

interface RustElementJson {
  tableId: number;
  funcs: number[];
  startAddress: number;
  endAddress: number;
}

interface RustLocalNameEntryJson {
  functionIndex: number;
  localIndex: number;
  value: string;
}

interface RustModuleJson {
  sections: RustSectionJson[];
  types: RustFuncTypeJson[];
  funcImports: RustFuncImportJson[];
  tableImports: RustTableImportJson[];
  funcs: RustFuncJson[];
  globals: RustGlobalJson[];
  exportedFuncs: RustFuncExportJson[];
  tableExports: RustTableExportJson[];
  elements: RustElementJson[];
  localNames: RustLocalNameEntryJson[];
}

// ---------------------------------------------------------------------------
// Public shape consumed by wasm_module_rust.ts
// ---------------------------------------------------------------------------

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
}

export interface WasmLocalSource {
  index: number;
  name: string;
  type: WASM.Type;
}

export interface FuncSource {
  id: number;
  name: string;
  type: WasmType;
  locals: WasmLocalSource[];
  body: WasmInstruction[];
}

export interface FuncImportSource {
  module: string;
  name: string;
  type: WasmType;
  startAddress: number;
  endAddress: number;
}

export interface TableImportSource {
  module: string;
  name: string;
  id: number;
  startAddress: number;
  endAddress: number;
}

export interface FuncExportSource {
  name: string;
  funcIndex: number;
}

export interface TableExportSource {
  name: string;
  id: number;
}

export interface GlobalSource {
  type: WASM.Type;
  mutable: boolean;
  name?: string;
  init: WasmInstruction[];
  startAddress: number;
  endAddress: number;
}

export interface ElementSource {
  tableId: number;
  funcs: number[];
  startAddress: number;
  endAddress: number;
}

export interface ParsedModule {
  sections: Section[];
  types: WasmType[];
  funcImports: FuncImportSource[];
  tableImports: TableImportSource[];
  funcs: FuncSource[];
  globals: GlobalSource[];
  exportedFuncs: FuncExportSource[];
  tableExports: TableExportSource[];
  elements: ElementSource[];
  wasmBuffer: Buffer;
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

const sectionTypeByName = new Map<string, SectionType>([
  ['type', SectionType.Type],
  ['import', SectionType.Import],
  ['func', SectionType.Function],
  ['table', SectionType.Table],
  ['global', SectionType.Global],
  ['code', SectionType.Code],
  ['memory', SectionType.Memory],
  ['export', SectionType.Export],
  ['element', SectionType.Element],
  ['custom', SectionType.Custom],
  ['data', SectionType.Data],
  ['start', SectionType.Start],
]);

function toWasmValType(t: string): WASM.Type {
  const found = WASM.typing.get(t);
  if (found === undefined) {
    throw new Error(`Rust parser returned an unsupported value type '${t}'`);
  }
  return found;
}

function toWasmType(ft: RustFuncTypeJson): WasmType {
  const t = new WasmType(ft.params.length, ft.results.length, ft.id);
  t.args = ft.params.map(toWasmValType);
  t.returnTypes = ft.results.map(toWasmValType);
  return t;
}

function hydrateInstr(json: RustInstrJson, types: WasmType[]): WasmInstruction {
  const opcode = wasmOpcodeFromNr(json.opcode, json.subOpcode);
  if (opcode === undefined) {
    throw new Error(
      `Unknown wasm opcode returned by the rust parser: 0x${json.opcode.toString(16)}${json.subOpcode !== undefined ? `/0x${json.subOpcode.toString(16)}` : ''}`,
    );
  }

  let instr: WasmInstruction;
  switch (json.kind) {
    case 'call': {
      instr = new CallInstruction(json.funcName ?? '', json.funcIndex ?? -1);
      break;
    }
    case 'callIndirect': {
      const signature = types[json.typeIndex ?? -1];
      if (signature === undefined) {
        throw new Error(
          `call_indirect refers to unknown type index ${json.typeIndex}`,
        );
      }
      instr = new CallIndirect(signature);
      break;
    }
    case 'indexed': {
      if (opcode === WasmCode.GlobalGet) {
        instr = new GlobalGetInstruction(json.index ?? 0);
      } else if (opcode === WasmCode.GlobalSet) {
        instr = new GlobalSetInstruction(json.index ?? 0);
      } else {
        instr = new WasmInstruction(opcode, json.index ?? 0);
      }
      break;
    }
    case 'memOp': {
      const isStore = json.opcode >= 0x36 && json.opcode <= 0x3e;
      instr = isStore
        ? new StoreInstruction(opcode, json.offset ?? 0)
        : new LoadInstruction(opcode, json.offset ?? 0);
      break;
    }
    case 'constI32': {
      instr = new ConstInstr(WasmCode.I32Const, json.i32Value ?? 0);
      break;
    }
    case 'constI64': {
      instr = new ConstInstr(
        WasmCode.I64Const,
        json.i64Low ?? 0,
        json.i64High ?? 0,
      );
      break;
    }
    case 'constF32': {
      instr = new ConstInstr(WasmCode.F32Const, json.f32Value ?? 0);
      break;
    }
    case 'constF64': {
      instr = new ConstInstr(WasmCode.F64Const, json.f64Value ?? 0);
      break;
    }
    case 'branch': {
      instr =
        opcode === WasmCode.BrIf
          ? new BranchIf(json.target ?? 0)
          : new Branch(json.target ?? 0);
      break;
    }
    case 'branchTable': {
      instr = new BranchTable(json.targets ?? []);
      break;
    }
    case 'block': {
      const label = json.label ?? `${json.start}`;
      instr = new BlockInstruction(
        label,
        (json.body ?? []).map((i) => hydrateInstr(i, types)),
      );
      break;
    }
    case 'loop': {
      const label = json.label ?? `${json.start}`;
      const resultType =
        json.resultType !== undefined
          ? toWasmValType(json.resultType)
          : undefined;
      instr = new LoopInstruction(
        label,
        (json.body ?? []).map((i) => hydrateInstr(i, types)),
        resultType,
      );
      break;
    }
    case 'if': {
      const label = json.label ?? `${json.start}`;
      const resultType =
        json.resultType !== undefined
          ? toWasmValType(json.resultType)
          : undefined;
      const consequence = (json.consequence ?? []).map((i) =>
        hydrateInstr(i, types),
      );
      const alternative = (json.alternative ?? []).map((i) =>
        hydrateInstr(i, types),
      );
      instr = new IfInstruction(
        label,
        [],
        alternative,
        consequence,
        resultType,
      );
      break;
    }
    case 'plain': {
      instr =
        opcode === WasmCode.Return
          ? new ReturnBranch()
          : new WasmInstruction(opcode);
      break;
    }
    default: {
      throw new Error(
        `Unknown instruction kind '${json.kind}' from rust parser`,
      );
    }
  }

  instr.startAddress = json.start;
  instr.endAddress = json.end;
  return instr;
}

function hydrateLocal(
  local: RustLocalJson,
  localNames: Map<number, string>,
): WasmLocalSource {
  return {
    index: local.index,
    name: localNames.get(local.index) ?? `local${local.index}`,
    type: toWasmValType(local.type),
  };
}

export function parseWasmModule(wasmPath: string): [ParsedModule, string[]] {
  const wasmBuffer = readFileSync(wasmPath);
  const errors: string[] = [];

  let raw: RustModuleJson;
  try {
    raw = JSON.parse(
      rustParser.parseWasmModule(new Uint8Array(wasmBuffer)),
    ) as RustModuleJson;
  } catch (e) {
    throw new Error(
      `Errors occurred while parsing module ${wasmPath} with the rust wasm-parser\n: ${e instanceof Error ? e.message : e}`,
    );
  }

  const sections: Section[] = raw.sections
    .map((s) => {
      const type = sectionTypeByName.get(s.section);
      if (type === undefined) {
        errors.push(`Cannot parse unsupported section ${s.section}`);
        return undefined;
      }
      return { type, startAddress: s.startAddress, endAddress: s.endAddress };
    })
    .filter((s): s is Section => s !== undefined)
    .sort((a, b) => a.startAddress - b.startAddress);

  const types = raw.types.map(toWasmType);

  const localNamesByFunc = new Map<number, Map<number, string>>();
  for (const n of raw.localNames) {
    let m = localNamesByFunc.get(n.functionIndex);
    if (m === undefined) {
      m = new Map();
      localNamesByFunc.set(n.functionIndex, m);
    }
    m.set(n.localIndex, n.value);
  }

  const funcImports: FuncImportSource[] = raw.funcImports.map((i) => ({
    module: i.module,
    name: i.name,
    type: types[i.typeIndex] ?? new WasmType(0, 0),
    startAddress: i.startAddress,
    endAddress: i.endAddress,
  }));

  const tableImports: TableImportSource[] = raw.tableImports.map((i) => ({
    module: i.module,
    name: i.name,
    id: i.id,
    startAddress: i.startAddress,
    endAddress: i.endAddress,
  }));

  const funcs: FuncSource[] = raw.funcs.map((f) => {
    const localNames = localNamesByFunc.get(f.id) ?? new Map<number, string>();
    return {
      id: f.id,
      name: f.name,
      type: types[f.typeIndex] ?? new WasmType(0, 0),
      locals: f.locals.map((l) => hydrateLocal(l, localNames)),
      body: f.body.map((i) => hydrateInstr(i, types)),
    };
  });

  const globals: GlobalSource[] = raw.globals.map((g) => ({
    type: toWasmValType(g.valueType),
    mutable: g.mutable,
    name: g.name,
    init: g.init.map((i) => hydrateInstr(i, types)),
    startAddress: g.startAddress,
    endAddress: g.endAddress,
  }));

  const exportedFuncs: FuncExportSource[] = raw.exportedFuncs.map((e) => ({
    name: e.name,
    funcIndex: e.funcIndex,
  }));

  const tableExports: TableExportSource[] = raw.tableExports.map((e) => ({
    name: e.name,
    id: e.id,
  }));

  const elements: ElementSource[] = raw.elements.map((e) => ({
    tableId: e.tableId,
    funcs: e.funcs,
    startAddress: e.startAddress,
    endAddress: e.endAddress,
  }));

  logger.debug(
    `Rust parser produced ${funcs.length} functions for ${wasmPath}`,
  );

  const mod: ParsedModule = {
    sections,
    types,
    funcImports,
    tableImports,
    funcs,
    globals,
    exportedFuncs,
    tableExports,
    elements,
    wasmBuffer,
  };
  return [mod, errors];
}
