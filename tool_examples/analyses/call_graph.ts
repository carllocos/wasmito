import { exit } from 'process';
import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { CallInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from './target_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';

function getFunctionName(wasm: WasmModule, fid: number): string {
  const f = wasm.getFunctionOrError(fid);
  if (f.exportName !== '') return f.exportName;
  if (f.name === '') return f.name;
  return `${fid}`;
}

async function main(wasmPath: string): Promise<void> {
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  const callgraph = new Set<string>();
  analysis.before(
    WasmCode.Call,
    (call: CallInstruction, _args: ReadOnlyWasmValue[]): void => {
      const caller = getFunctionName(wasm, wasm.getEnclosingFunction(call).id);
      const callee = getFunctionName(wasm, call.calledFunc);
      const edge = `${caller} -> ${callee}`;
      if (!callgraph.has(edge)) console.log(`Call: ${edge} `);
      callgraph.add(edge);
    },
  );

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
