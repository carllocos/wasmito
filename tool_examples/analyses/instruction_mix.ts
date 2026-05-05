/***
 ** This is an implementation of Wasabi's analysis
 ** Original source file found in: github.com/aaronmunsters/wasabi/tree/master/examples/analyses
 ***/
import { exit } from 'process';
import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from './target_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';

const counts = new Map<string, number>();
function increaseCount(
  instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  counts.set(instr.name, (counts.get(instr.name) ?? 0) + 1);
  console.log(`${instr.name} (#${counts.get(instr.name)})`);
}

async function main(wasmPath: string): Promise<void> {
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);

  // hooks that correspond direclty to one instruction
  analysis.before(WasmCode.NOP, increaseCount);
  analysis.before(WasmCode.Unreachable, increaseCount);
  analysis.before(WasmCode.If, increaseCount);
  analysis.before(WasmCode.Br, increaseCount);
  analysis.before(WasmCode.BrIf, increaseCount);
  analysis.before(WasmCode.BrTable, increaseCount);
  analysis.before(WasmCode.Drop, increaseCount);
  analysis.before(WasmCode.Select, increaseCount);
  analysis.before(WasmCode.MemorySize, increaseCount);
  analysis.before(WasmCode.MemoryGrow, increaseCount);

  // Hooks that correspond to multiple instructions
  analysis.before(WasmCode.MultipleOpcode.Unary, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Binary, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Load, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Store, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Local, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Global, increaseCount);

  // Special cases
  analysis.before(WasmCode.Call, increaseCount);
  analysis.before(WasmCode.CallIndirect, increaseCount);
  analysis.before(WasmCode.MultipleOpcode.Const, increaseCount);
  analysis.before(WasmCode.Return, increaseCount);
  // analysis.begin(...) // TODO begin

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
