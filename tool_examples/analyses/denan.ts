/***
 ** This is an implementation of the Safe heap analysis as provided by Wastrumentation
 ** Original source file found in: https://github.com/aaronmunsters/wastrumentation/blob/main/benchmarking-node/input-analyses/rust/denan/src/lib.rs
 ***/
import { WasmModule } from '../../src/webassembly/wasm/wasm_module';
import { WasmAnalysis } from '../../src/tool_api/wasm_analysis';
import { WritableWasmValue } from '../../src/tool_api/interrupts';
import { WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { connectToExistingDevVM, spawnDevVM, spawnMCUVM } from '../spawn_vm';
import { WasmCode } from '../../src/webassembly/wasm/wasm_opcode';
import { WASM } from '../../src/webassembly/wasm';
import { createLogger } from '../../src/logger/logger';

const logger = createLogger('DenanAnalysis');

function logTime(start: number, end: number, msg: string) {
  const diff = end - start;
  logger.info(
    `${msg} Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
  );
  return diff;
}
function denan(v: WritableWasmValue): WritableWasmValue {
  console.log(`Try denan: ${WASM.typeToString(v.type)}.const ${v.value}`);
  switch (v.type) {
    case WASM.Type.f32:
    case WASM.Type.f64:
      if (isNaN(v.value)) {
        v.value = 0.0;
        console.log(`Denan to ${v.value}`);
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

export async function analyse(wasmPath: string): Promise<void> {
  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  logTime(startTimeParse, Date.now(), 'Wasm Parsing');

  logger.info(`spawning & connecting to WARDuino...`);
  const vmConnection = await spawnDevVM(wasm); // for local VM
  // const vmConnection = await connectToExistingDevVM(wasm, 8192);
  // const vmConnection = await spawnMCUVM(wasm, TargetVMConfig); // for MCU VM
  const analysis = new WasmAnalysis(wasm, vmConnection);
  logger.info(`Registering Advices...`);
  const startTimeRegister = Date.now();
  analysis.afterMut(WasmCode.MultipleOpcode.Const, denanResult);
  analysis.afterMut(WasmCode.LocalGet, denanResult);
  analysis.afterMut(WasmCode.GlobalGet, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Load, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Store, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Unary, denanResult);
  analysis.afterMut(WasmCode.MultipleOpcode.Binary, denanResult);
  analysis.beforeMut(WasmCode.Call, denanArgs);
  analysis.afterMut(WasmCode.Call, denanResult);

  logTime(startTimeRegister, Date.now(), 'Registering Advices');

  logger.info(`Deploying Advices...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  logTime(startTimeDeploy, Date.now(), 'Deploy Hooks');

  logger.info(`Running WARDuino`);

  const startTimeAnalysis = Date.now();
  return await analysis.run(() => {
    logTime(startTimeAnalysis, Date.now(), 'Analysis Took');
  });
}
