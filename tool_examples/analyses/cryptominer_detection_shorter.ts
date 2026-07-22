/***
 ** This is an implementation of Wasabi's analysis
 ** Original source file found in: github.com/aaronmunsters/wasabi/tree/master/examples/analyses
 ***/
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
import { createLogger } from '../../src/logger/logger';

const logger = createLogger('CryptoMiningAnalysis');

function logTime(start: number, end: number, msg: string) {
  const diff = end - start;
  logger.info(
    `${msg} Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
  );
}
export async function analyse(wasmPath: string): Promise<void> {
  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  logTime(startTimeParse, Date.now(), 'Wasm Parsing');

  logger.info(`spawning & connecting to WARDuino...`);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);

  const counts = new Map<number, number>();

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.before(
    WasmCode.MultipleOpcode.Binary,
    (instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void => {
      console.log(
        `In function ${instr.getEnclosingFunction().id} instr ${instr.getIndexInFunction()}`,
      );
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
          // console.log(
          // `${instr.name} (#${counts.get(getWasmOpcodeNr(instr.opcode))})`,
          // );
          break;
      }
    },
  );
  logTime(startTimeRegister, Date.now(), 'Registering Advices');

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  logTime(startTimeDeploy, Date.now(), 'Deploy Hooks');

  logger.info(`Running WARDuino`);
  await analysis.run();
}
