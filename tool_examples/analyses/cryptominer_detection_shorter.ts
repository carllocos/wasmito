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
import {
  getWasmOpcodeNr,
  WasmCode,
} from '../../src/webassembly/wasm/wasm_opcode';

async function main(wasmPath: string): Promise<void> {
  const wasm = new WasmModule(wasmPath);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);

  const counts = new Map<number, number>();
  analysis.before(
    WasmCode.MultipleOpcode.Binary,
    (instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void => {
      switch (getWasmOpcodeNr(instr.opcode)) {
        case getWasmOpcodeNr(WasmCode.I32Add):
        case getWasmOpcodeNr(WasmCode.I32And):
        case getWasmOpcodeNr(WasmCode.I32Shl):
        case getWasmOpcodeNr(WasmCode.I32ShrU):
        case getWasmOpcodeNr(WasmCode.I32Xor):
          counts.set(
            getWasmOpcodeNr(instr.opcode),
            (counts.get(getWasmOpcodeNr(instr.opcode)) ?? 0) + 1,
          );
          console.log(
            `${instr.name} (#${counts.get(getWasmOpcodeNr(instr.opcode))})`,
          );
          break;
      }
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
