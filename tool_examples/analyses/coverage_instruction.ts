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
import { createLogger } from '../../src/logger/logger';

const logger = createLogger('CoverageInstrAnalysis');

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
  const coverage = new Map<number, Set<number>>();
  const cb = (instr: WasmInstruction, _args: ReadOnlyWasmValue[]): void => {
    const f = instr.getEnclosingFunction();
    const s = coverage.get(f.id) ?? new Set<number>();
    const newS = s.add(instr.startAddress);
    coverage.set(f.id, newS);
    console.log(
      `function ${f.id} index ${instr.getIndexInFunction()} (counts #${newS.size})`,
    );
  };

  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  for (const f of wasm.functions) {
    for (const i of f.allInstructions) {
      analysis.before(i, cb);
    }
  }
  logTime(startTimeRegister, Date.now(), 'Registering Advices');

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  logTime(startTimeDeploy, Date.now(), 'Deploy Hooks');

  logger.info(`Running WARDuino`);
  await analysis.run();
}
