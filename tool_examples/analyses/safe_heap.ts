/***
 ** This is an implementation of the Safe heap analysis as provided by Wastrumentation
 ** Original source file found in: https://github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/safe-heap/src/lib.rs
 ***/
import assert from 'assert';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import {
  LoadInstruction,
  StoreInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { createLogger } from '../../src/logger/logger';

function logTime(start: number, end: number, msg: string) {
  const diff = end - start;
  logger.info(
    `${msg} Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
  );
}

function boundCheck(index: number, bytes: number, offset: number): void {
  const addr = offset + index; //offset is the statically encoded offset, index the dynamic stack offset
  const lastByteAddr = addr + bytes;
  const memoryPageSize = 2 ** 16;
  console.log(`bound check- index ${index}, bytes ${bytes}, offset ${offset}`);
  assert(lastByteAddr <= memoryPageSize, 'memory overflow');
}

function alignmentCheck(index: number, size: number): void {
  console.log(`alignmentCheck ${index}, size ${size}`);
  assert((index & (size - 1)) === 0);
}

function safeLoad(
  load: LoadInstruction,
  args: WritableWasmValue[],
): WritableWasmValue[] {
  console.log(`load instr addr=${load.startAddress}`);
  boundCheck(args[0].value, load.targetValueSize(), load.offset);
  alignmentCheck(args[0].value, load.targetValueSize());
  return args;
}

function safeStore(
  store: StoreInstruction,
  args: WritableWasmValue[],
): WritableWasmValue[] {
  console.log(`store instr addr=${store.startAddress}`);
  boundCheck(args[1].value, store.targetValueSize(), store.offset);
  alignmentCheck(args[1].value, store.targetValueSize());
  return args;
}

const logger = createLogger('SafeHeapAnalysis');

export async function analyse(wasmPath: string): Promise<void> {
  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  logTime(startTimeParse, Date.now(), 'Wasm Parsing');

  logger.info(`spawning & connecting to WARDuino...`);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.beforeMut(WasmCode.MultipleOpcode.Load, safeLoad);
  analysis.beforeMut(WasmCode.MultipleOpcode.Store, safeStore);
  logTime(startTimeRegister, Date.now(), 'Registering Advices');

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  logTime(startTimeDeploy, Date.now(), 'Deploy Hooks');

  logger.info(`running WARDuino`);
  await analysis.run();
}
