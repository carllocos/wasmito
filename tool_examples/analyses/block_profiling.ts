import { exit } from 'process';
import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  WasmAddress,
  WasmInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from './target_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';

const blockCount = new Map<WasmAddress, number>();
function addBlockEnter(
  instr: WasmInstruction,
  _args: ReadOnlyWasmValue[],
): void {
  console.log(`Block encountered`);
  const count = blockCount.get(instr.startAddress) ?? 0;
  blockCount.set(instr.startAddress, count + 1);
  console.log(
    `\tcount=${count + 1} - 0x${instr.startAddress.toString(16)}:${instr.name}`,
  );
  return;
}

export function getCount(
  wasm: WasmModule,
  fid: number,
  instrIdx: number,
): number {
  const f = wasm.getFunction(fid);
  if (f === undefined) return 0;
  const i = f.allInstructions[instrIdx];
  if (i === undefined) return 0;
  return blockCount.get(i.startAddress) ?? 0;
}

async function main(wasmPath: string): Promise<void> {
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM

  const analysis = new WasmAnalysis(wasm, vmConnection);
  analysis.before(WasmCode.If, addBlockEnter);
  analysis.before(WasmCode.Else, addBlockEnter);
  analysis.before(WasmCode.Call, addBlockEnter);
  analysis.before(WasmCode.CallIndirect, addBlockEnter);
  analysis.before(WasmCode.Block, addBlockEnter);
  analysis.before(WasmCode.Loop, addBlockEnter);

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
