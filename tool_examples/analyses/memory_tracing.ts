/***
 ** This is an implementation of Wasabi's analysis
 ** Original source file found in: github.com/aaronmunsters/wasabi/tree/master/examples/analyses
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import {
  isLoadInstruction,
  isStoreInstruction,
  LoadInstruction,
  StoreInstruction,
  WasmInstruction,
} from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { createLogger } from '../../src/logger/logger';

const logger = createLogger('MemoryTracingAnalysis');

function logTime(start: number, end: number, msg: string) {
  const diff = end - start;
  logger.info(
    `${msg} Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
  );
}

type Access = [number, WasmInstruction, number, boolean];
const accesses: Access[] = [];
function access(
  instr: LoadInstruction | StoreInstruction,
  args: ReadOnlyWasmValue[],
): void {
  const fid = instr.getEnclosingFunction().id;
  const addr = instr.offset + args[isLoadInstruction(instr) ? 0 : 1].value;
  const a: Access = [fid, instr, addr, isStoreInstruction(instr)];
  accesses.push(a);
  console.log(`Function ${fid} instruction ${instr.getIndexInFunction()}`);
}

export async function analyse(wasmPath: string): Promise<void> {
  logger.info(`Parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  logTime(startTimeParse, Date.now(), 'Wasm Parsing');

  logger.info(`spawning & connecting to WARDuino...`);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.before(WasmCode.MultipleOpcode.Load, access);
  analysis.before(WasmCode.MultipleOpcode.Store, access);
  logTime(startTimeRegister, Date.now(), 'Registering Advices');

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  logTime(startTimeDeploy, Date.now(), 'Deploy Hooks');

  logger.info(`running WARDuino`);
  await analysis.run();
}
