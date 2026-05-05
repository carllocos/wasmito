/***
 ** This is an implementation of the Safe heap analysis as provided by Wastrumentation
 ** Original source file found in: https://github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/denan/src/lib.rs
 ***/
import { exit } from 'process';
import { resolve } from 'path';
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { WASM } from '../../src/webassembly/wasm';

function denan(v: WritableWasmValue): WritableWasmValue {
  console.log(`About to denan: ${WASM.typeToString(v.type)}.const ${v.value}`);
  switch (v.type) {
    case WASM.Type.f32:
    case WASM.Type.f64:
      if (isNaN(v.value)) {
        v.value = 0.0;
        console.log(`denan to ${v.value}`);
      }
  }
  return v;
}

function denanResult(
  _instr: WasmInstruction,
  result: WritableWasmValue | undefined,
): WritableWasmValue | undefined {
  if (result === undefined) return undefined;
  return denan(result);
}

function denanArgs(
  _instr: WasmInstruction,
  args: WritableWasmValue[],
): WritableWasmValue[] {
  return args.map(denan);
}

async function main(wasmPath: string): Promise<void> {
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  analysis.afterMut(WasmCode.MultipleOpcode.Const, denanResult);
  analysis.afterMut(WasmCode.LocalGet, denanResult);
  analysis.afterMut(WasmCode.GlobalGet, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Load, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Store, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Unary, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Binary, denanResult);
  analysis.beforeMut(WasmCode.Call, denanArgs);
  analysis.afterMut(WasmCode.Call, denanResult);

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
