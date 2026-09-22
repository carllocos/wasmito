/***
 ** This is an implementation of Whamm's instruction-category (imix) analysis
 ** Original source file found in:
 ** github.com/ejrgilbert/whamm/blob/master/tests/scripts/paper_eval/categories/category-hw.mm
 **
 ** Original Whamm script:
 **   report var dyn_categories: map<u32, i32>;
 **   wasm:opcode:*:before {
 **       dyn_categories[category_id]++;
 **   }
 **
 ** Instruments every instruction and counts how many times an instruction of that category
 ** is dynamically executed.
 ** For comparison with Whamm, category IDs intentionally match Whamm's `category_id` numbering
 ** found in github.com/ejrgilbert/whamm/blob/master/providers/packages/events/wasm-opcode-STAR.yaml
 ***/
import assert from 'assert';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import {
  getWasmOpcodeNr,
  getWasmSubOpcodeNr,
  WasmCode,
  WasmOpcode,
} from '../../src/webassembly/wasm/wasm_opcode';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from './target_vm';
import { createLogger } from '../../src/logger/logger';
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';

const logger = createLogger('InstructionMixAnalysis');

enum CategoryId {
  Arith = 0,
  Atomic = 1,
  Compare = 2,
  Const = 3,
  Control = 4,
  Convert = 5,
  Exn = 6,
  Gc = 7,
  Global = 8,
  Load = 9,
  Local = 10,
  Memory = 11,
  Misc = 12,
  Ref = 13,
  Simd = 14,
  Store = 15,
  Table = 16,
}

const CATEGORY_NAMES: Record<CategoryId, string> = {
  [CategoryId.Arith]: 'arith',
  [CategoryId.Atomic]: 'atomic',
  [CategoryId.Compare]: 'compare',
  [CategoryId.Const]: 'const',
  [CategoryId.Control]: 'control',
  [CategoryId.Convert]: 'convert',
  [CategoryId.Exn]: 'exn',
  [CategoryId.Gc]: 'gc',
  [CategoryId.Global]: 'global',
  [CategoryId.Load]: 'load',
  [CategoryId.Local]: 'local',
  [CategoryId.Memory]: 'memory',
  [CategoryId.Misc]: 'misc',
  [CategoryId.Ref]: 'ref',
  [CategoryId.Simd]: 'simd',
  [CategoryId.Store]: 'store',
  [CategoryId.Table]: 'table',
};

// Mirrors the opcode -> category_id assignment of
// providers/packages/events/wasm-opcode-STAR.yaml, restricted to the opcodes
// this VM actually supports (no atomic, exn, simd or gc-struct/array opcodes).
const CATEGORY_OPCODES: [CategoryId, WasmOpcode[]][] = [
  [CategoryId.Misc, [WasmCode.Unreachable, WasmCode.NOP, WasmCode.Drop]],
  [
    CategoryId.Control,
    [
      WasmCode.Block,
      WasmCode.Loop,
      WasmCode.If,
      WasmCode.Else,
      WasmCode.End,
      WasmCode.Br,
      WasmCode.BrIf,
      WasmCode.BrTable,
      WasmCode.Return,
      WasmCode.Call,
      WasmCode.CallIndirect,
      WasmCode.Select,
    ],
  ],
  [CategoryId.Local, [WasmCode.LocalGet, WasmCode.LocalSet, WasmCode.LocalTee]],
  [CategoryId.Global, [WasmCode.GlobalGet, WasmCode.GlobalSet]],
  [CategoryId.Load, WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Load)],
  [CategoryId.Store, WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Store)],
  [
    CategoryId.Memory,
    [
      WasmCode.MemorySize,
      WasmCode.MemoryGrow,
      WasmCode.MemoryFill,
      WasmCode.MemoryCopy,
    ],
  ],
  [CategoryId.Const, WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Const)],
  [
    CategoryId.Table,
    [
      WasmCode.TableGet,
      WasmCode.TableSet,
      WasmCode.TableCopy,
      WasmCode.TableSize,
      WasmCode.TableInit,
      WasmCode.TableGrow,
      WasmCode.TableFill,
    ],
  ],
  [CategoryId.Gc, [WasmCode.RefNull, WasmCode.RefIsNull, WasmCode.RefFunc]],
  [
    CategoryId.Compare,
    [
      WasmCode.I32Eq,
      WasmCode.I32Eqz,
      WasmCode.I32Ne,
      WasmCode.I32LtS,
      WasmCode.I32LtU,
      WasmCode.I32GtS,
      WasmCode.I32GtU,
      WasmCode.I32LeS,
      WasmCode.I32LeU,
      WasmCode.I32GeS,
      WasmCode.I32GeU,

      WasmCode.I64Eqz,
      WasmCode.I64Eq,
      WasmCode.I64Ne,
      WasmCode.I64LtS,
      WasmCode.I64LtU,
      WasmCode.I64GtS,
      WasmCode.I64GtU,
      WasmCode.I64LeS,
      WasmCode.I64LeU,
      WasmCode.I64GeS,
      WasmCode.I64GeU,

      WasmCode.F32Eq,
      WasmCode.F32Ne,
      WasmCode.F32Lt,
      WasmCode.F32Gt,
      WasmCode.F32Le,
      WasmCode.F32Ge,

      WasmCode.F64Eq,
      WasmCode.F64Ne,
      WasmCode.F64Lt,
      WasmCode.F64Gt,
      WasmCode.F64Le,
      WasmCode.F64Ge,
    ],
  ],
  [
    CategoryId.Arith,
    [
      WasmCode.I32Clz,
      WasmCode.I32Ctz,
      WasmCode.I32Popcnt,
      WasmCode.I32Add,
      WasmCode.I32Sub,
      WasmCode.I32Mul,
      WasmCode.I32DivS,
      WasmCode.I32DivU,
      WasmCode.I32RemS,
      WasmCode.I32RemU,
      WasmCode.I32And,
      WasmCode.I32Or,
      WasmCode.I32Xor,
      WasmCode.I32Shl,
      WasmCode.I32ShrS,
      WasmCode.I32ShrU,
      WasmCode.I32Rotl,
      WasmCode.I32Rotr,

      WasmCode.I64Clz,
      WasmCode.I64Ctz,
      WasmCode.I64Popcnt,
      WasmCode.I64Add,
      WasmCode.I64Sub,
      WasmCode.I64Mul,
      WasmCode.I64DivS,
      WasmCode.I64DivU,
      WasmCode.I64RemS,
      WasmCode.I64RemU,
      WasmCode.I64And,
      WasmCode.I64Or,
      WasmCode.I64Xor,
      WasmCode.I64Shl,
      WasmCode.I64ShrS,
      WasmCode.I64ShrU,
      WasmCode.I64Rotl,
      WasmCode.I64Rotr,

      WasmCode.F32Abs,
      WasmCode.F32Neg,
      WasmCode.F32Ceil,
      WasmCode.F32Floor,
      WasmCode.F32Trunc,
      WasmCode.F32Nearest,
      WasmCode.F32Sqrt,
      WasmCode.F32Add,
      WasmCode.F32Sub,
      WasmCode.F32Mul,
      WasmCode.F32Div,
      WasmCode.F32Min,
      WasmCode.F32Max,
      WasmCode.F32Copysign,

      WasmCode.F64Abs,
      WasmCode.F64Neg,
      WasmCode.F64Ceil,
      WasmCode.F64Floor,
      WasmCode.F64Trunc,
      WasmCode.F64Nearest,
      WasmCode.F64Sqrt,
      WasmCode.F64Add,
      WasmCode.F64Sub,
      WasmCode.F64Mul,
      WasmCode.F64Div,
      WasmCode.F64Min,
      WasmCode.F64Max,
      WasmCode.F64Copysign,
    ],
  ],
  [
    CategoryId.Convert,
    [
      WasmCode.I32WrapI64,
      WasmCode.I32TruncSF32,
      WasmCode.I32TruncUF32,
      WasmCode.I32TruncSF64,
      WasmCode.I32TruncUF64,
      WasmCode.I32Extend8S,
      WasmCode.I32Extend16S,

      WasmCode.I64ExtendSI32,
      WasmCode.I64ExtendUI32,
      WasmCode.I64TruncSF32,
      WasmCode.I64TruncUF32,
      WasmCode.I64TruncSF64,
      WasmCode.I64TruncUF64,
      WasmCode.I64Extend8S,
      WasmCode.I64Extend16S,
      WasmCode.I64Extend32S,

      WasmCode.F32ConvertSI32,
      WasmCode.F32ConvertUI32,
      WasmCode.F32ConvertSI64,
      WasmCode.F32ConvertUI64,
      WasmCode.F32DemoteF64,

      WasmCode.F64ConvertSI32,
      WasmCode.F64ConvertUI32,
      WasmCode.F64ConvertSI64,
      WasmCode.F64ConvertUI64,
      WasmCode.F64PromoteF32,

      WasmCode.I32ReinterpretF32,
      WasmCode.I64ReinterpretF64,
      WasmCode.F32ReinterpretI32,
      WasmCode.F64ReinterpretI64,
    ],
  ],
];

function opcodeKey(op: WasmOpcode): string {
  return `${getWasmOpcodeNr(op)}:${getWasmSubOpcodeNr(op)}`;
}

const OPCODE_TO_CATEGORY = new Map<string, CategoryId>();
for (const [category, opcodes] of CATEGORY_OPCODES) {
  for (const op of opcodes) {
    OPCODE_TO_CATEGORY.set(opcodeKey(op), category);
  }
}

function categoryOf(instr: WasmInstruction): CategoryId {
  const category = OPCODE_TO_CATEGORY.get(opcodeKey(instr.opcode));
  assert(
    category !== undefined,
    `No hardware category for opcode '${instr.name}'`,
  );
  return category;
}

const dynCategories = new Map<CategoryId, number>();

function countCategory(
  instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  const category = categoryOf(instr);
  dynCategories.set(category, (dynCategories.get(category) ?? 0) + 1);
}

function logStats(): void {
  console.log('category_id, category_name, count');
  for (const category of Object.values(CategoryId).filter(
    (v) => typeof v === 'number',
  ) as CategoryId[]) {
    console.log(
      `${category}, ${CATEGORY_NAMES[category]}, ${dynCategories.get(category) ?? 0}`,
    );
  }
}

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
): Promise<BenchmarkMeasurement> {
  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  const parseTime = logMeasurement(
    logger,
    startTimeParse,
    Date.now(),
    'Wasm Parsing',
  );

  logger.info(`spawning & connecting to WARDuino...`);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      analysis.before(i, countCategory);
    }
  }
  const registerTime = logMeasurement(
    logger,
    startTimeRegister,
    Date.now(),
    'Registering Advices',
  );

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  const deployTime = logMeasurement(
    logger,
    startTimeDeploy,
    Date.now(),
    'Deploy Hooks',
  );

  logger.info(`running WARDuino`);
  const analysisStartTime = Date.now();
  try {
    await analysis.run(logStats, timeouts.timeoutMsAnalysisRun);
    const analysisTime = logMeasurement(
      logger,
      analysisStartTime,
      Date.now(),
      'Analysis Completion',
    );
    return {
      wasmParsingMs: parseTime,
      advicesRegistrationMs: registerTime,
      advicesDeploymentMs: deployTime,
      analysisRunMs: analysisTime,
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : e;
    const f: FailedMeasurement = {
      errorParsing: `${parseTime}`,
      errorRegister: `${parseTime}`,
      errorDeploy: `${parseTime}`,
      errorRun: `${errMsg}`,
    };
    return f;
  }
}
