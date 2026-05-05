/***
 ** This is an implementation of Wasabi's analysis
 ** Original source file found in: github.com/aaronmunsters/wasabi/tree/master/examples/analyses
 ***/
import { exit } from 'process';
import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  isLoadInstruction,
  LoadInstruction,
  StoreInstruction,
  WasmInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';

type Access = [number, WasmInstruction, number, boolean];
type Advice = (
  instr: LoadInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
) => void;

const accesses: Access[] = [];
function access(wasm: WasmModule, write: boolean): Advice {
  return (instr, args) => {
    const fid = wasm.getEnclosingFunction(instr).id ?? -1;
    const addr = instr.offset + args[isLoadInstruction(instr) ? 0 : 1].value;
    const a: Access = [fid, instr, addr, write];
    accesses.push(a);
    console.log(a);
  };
}

async function main(wasmPath: string): Promise<void> {
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  analysis.before(WasmCode.MultipleOpcode.Load, access(wasm, false));
  analysis.before(WasmCode.MultipleOpcode.Store, access(wasm, true));

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
