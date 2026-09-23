/***
 ** An implementation of Whamm's instruction-category (imix)
 ** github.com/ejrgilbert/whamm/blob/master/tests/scripts/paper_eval/categories/category-hw.mm
 **
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

// Categories reuse the opcode groupings already present in this codebase:
// `WasmCode.MultipleOpcode` (unary/binary/load/store/local/global/const) and
// `WasmCode.Struct` (block/loop/if), plus the remaining individual opcodes.
const CATEGORY_OPCODES: [string, WasmOpcode[]][] = [
  ['unreachable', [WasmCode.Unreachable]],
  ['nop', [WasmCode.NOP]],
  ['drop', [WasmCode.Drop]],
  ['select', [WasmCode.Select]],
  ['block', [WasmCode.Block]],
  ['loop', [WasmCode.Loop]],
  ['if', [WasmCode.If, WasmCode.Else]],
  ['end', [WasmCode.End]],
  ['branch', [WasmCode.Br, WasmCode.BrIf, WasmCode.BrTable]],
  ['return', [WasmCode.Return]],
  ['call', [WasmCode.Call, WasmCode.CallIndirect]],
  ['local', [WasmCode.LocalGet, WasmCode.LocalSet, WasmCode.LocalTee]],
  ['global', [WasmCode.GlobalGet, WasmCode.GlobalSet]],
  ['load', WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Load)],
  ['store', WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Store)],
  [
    'memory',
    [
      WasmCode.MemorySize,
      WasmCode.MemoryGrow,
      WasmCode.MemoryFill,
      WasmCode.MemoryCopy,
    ],
  ],
  ['const', WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Const)],
  ['unary', WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Unary)],
  ['binary', WasmCode.toSingleOpcodes(WasmCode.MultipleOpcode.Binary)],
  [
    'table',
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
  ['ref', [WasmCode.RefNull, WasmCode.RefIsNull, WasmCode.RefFunc]],
];

function opcodeKey(op: WasmOpcode): string {
  return `${getWasmOpcodeNr(op)}:${getWasmSubOpcodeNr(op)}`;
}

const OPCODE_TO_CATEGORY = new Map<string, string>();
for (const [category, opcodes] of CATEGORY_OPCODES) {
  for (const op of opcodes) {
    OPCODE_TO_CATEGORY.set(opcodeKey(op), category);
  }
}

function categoryOf(instr: WasmInstruction): string {
  const category = OPCODE_TO_CATEGORY.get(opcodeKey(instr.opcode));
  assert(category !== undefined, `No category for opcode '${instr.name}'`);
  return category;
}

const dynCategories = new Map<string, number>();

function countCategory(
  instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  const category = categoryOf(instr);
  dynCategories.set(category, (dynCategories.get(category) ?? 0) + 1);
}

function logStats(): void {
  console.log('category, count');
  for (const [category] of CATEGORY_OPCODES) {
    console.log(`${category}, ${dynCategories.get(category) ?? 0}`);
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
  const startTimeSpawn = Date.now();
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const spawnTime = logMeasurement(
    logger,
    startTimeSpawn,
    Date.now(),
    'Spawning VM',
  );

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
      vmSpawnMs: spawnTime,
      advicesRegistrationMs: registerTime,
      advicesDeploymentMs: deployTime,
      analysisRunMs: analysisTime,
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : e;
    const f: FailedMeasurement = {
      errorParsing: `${parseTime}`,
      errorSpawn: `${spawnTime}`,
      errorRegister: `${parseTime}`,
      errorDeploy: `${parseTime}`,
      errorRun: `${errMsg}`,
    };
    return f;
  }
}
