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
import {
  BenchmarkMeasurement,
  FailedMeasurement,
  logMeasurement,
  TimeoutConfig,
} from '../../src/util/benchmark_util';

const logger = createLogger('CryptoMiningAnalysis');

export async function analyse(
  wasmPath: string,
  timeouts: TimeoutConfig,
): Promise<BenchmarkMeasurement> {
  logger.info(`parsing Wasm module '${wasmPath}'`);
  const startTimeParse = Date.now();
  const wasm = new WasmModule(wasmPath);
  const parseTime = logMeasurement(
    logger,
    startTimeParse,
    Date.now(),
    'Wasm Parsing',
  );

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
  const registerTime = logMeasurement(
    logger,
    startTimeRegister,
    Date.now(),
    'Registering Advices',
  );

  logger.info(`Deploying Hooks...`);
  const startTimeDeploy = Date.now();
  await analysis.deploy();
  const deployTime = logMeasurement(
    logger,
    startTimeDeploy,
    Date.now(),
    'Deploy Hooks',
  );

  logger.info(`Running WARDuino`);
  const analyseStartTime = Date.now();
  try {
    await analysis.run(timeouts.timeoutMsAnalysisRun);
    const analysisTime = logMeasurement(
      logger,
      analyseStartTime,
      Date.now(),
      'Analysis Run',
    );
    return {
      wasmParsingMs: parseTime,
      advicesRegistrationMs: registerTime,
      advicesDeploymentMs: deployTime,
      analysisRunMs: analysisTime,
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : e;
    const f: FailedMeasurement = {
      errorParsing: `${parseTime}`,
      errorRegister: `${parseTime}`,
      errorDeploy: `${parseTime}`,
      errorRun: `${errMsg}`,
    };
    return f;
  }
}
