/***
 ** This is an implementation of the Safe heap analysis as provided by Wastrumentation
 ** Original source file found in: https://github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/safe-heap/src/lib.rs
 ***/
import assert from 'assert';
import { exit } from 'process';
import { resolve } from 'path';
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

async function main(wasmPath: string): Promise<void> {
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  analysis.beforeMut(WasmCode.MultipleOpcode.Load, safeLoad);
  analysis.beforeMut(WasmCode.MultipleOpcode.Store, safeStore);

  await analysis.deploy();
  await analysis.run();
}

const program = resolve(
  './app_examples/assemblyscript/toggle_led/wasm/toggle_led.wasm',
);
main(program).catch((err) => {
  console.error(err);
  exit(1);
});
