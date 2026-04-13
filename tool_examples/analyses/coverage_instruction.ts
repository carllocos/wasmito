import { exit } from 'process';
import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';

async function main(wasmPath: string): Promise<void> {
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const coverage = new Map<number, Set<number>>();
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      analysis.before(
        i,
        (instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void => {
          const f = wasm.getEnclosingFunction(instr);
          const s = coverage.get(f.id) ?? new Set<number>();
          const newS = s.add(instr.startAddress);
          coverage.set(f.id, newS);
          console.log(`Count FID=${f.id} #${newS.size}`);
        },
      );
    }
  }

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
