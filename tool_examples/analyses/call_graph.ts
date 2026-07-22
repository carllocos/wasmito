/***
 ** This is an implementation of Wasabi's analysis
 ** Original source file found in: github.com/aaronmunsters/wasabi/tree/master/examples/analyses
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { ReadOnlyWasmValue } from '../../src/tool_api/interrupts';
import { CallInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { spawnDevVM, spawnMCUVM } from '../spawn_vm';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TargetVMConfig } from './target_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { createLogger } from '../../src/logger/logger';
const logger = createLogger('CallGraphAnalysis');

function logTime(start: number, end: number, msg: string) {
  const diff = end - start;
  logger.info(
    `${msg} Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
  );
}

function getFunctionName(wasm: WasmModule, fid: number): string {
  const f = wasm.getFunctionOrError(fid);
  if (f.exportName !== '') return f.exportName;
  if (f.name === '') return f.name;
  return `${fid}`;
}

export async function analyse(wasmPath: string): Promise<void> {
  logger.info(`Parsing WasmModule '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  logTime(startTimeParse, Date.now(), 'Wasm Parsing');

  logger.info(`spawning & connection to WARDuino...`);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM

  const analysis = new WasmAnalysis(wasm, vmConnection);
  const callgraph = new Set<string>();

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.before(
    WasmCode.Call,
    (call: CallInstruction, _args: ReadOnlyWasmValue[]): void => {
      const caller = getFunctionName(wasm, wasm.getEnclosingFunction(call).id);
      const callee = getFunctionName(wasm, call.calledFunc);
      const edge = `${caller} -> ${callee}`;
      console.log(`Call: ${edge} `);
      callgraph.add(edge);
    },
  );
  logTime(startTimeRegister, Date.now(), 'Registering Advices');

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  logTime(startTimeDeploy, Date.now(), 'Deploy Hooks');

  logger.info(`running VM`);
  await analysis.run();
}
