import * as fs from 'fs';

import { type DebugAPI } from '../debuggers/debug_api';
import { SourceMapFromJSON } from '../../src/source_mappers/source_map_builder';
import path from 'path';
import { StepWiseDBG } from '../debuggers/stepwise_debugger';
import { benchStepInto } from './bench_step_into';
import {
  type BenchConfig,
  type BenchData,
  BenchDBGOperation,
  readBenchDataFile,
} from './config';
import { benchStepOver } from './bench_step_over';
import { ControlFlowGraphDBG } from '../debuggers/cfg_debugger';
import { WARDuinoDevBackend } from '../runtimes/warduino/warduino_devvm';
import { WasmitoDevVM } from '../runtimes/wasmito/wasmito_devm';
import {
  type SourceCodeLocation,
  sourceCodeLocationToString,
} from '../../src/source_mappers/source_map';
import { WARDuinoBackendMCU } from '../runtimes/warduino/warduino_mcu';
import { benchStepOut } from './bench_step_out';

async function bench(): Promise<void> {
  const benchFile = path.resolve('bench/data/bench.json');
  const benchData: BenchData = readBenchDataFile(benchFile);
  const nrOfRuns = benchData.nrOfRuns;
  const nrOfWarmups = benchData.nrOfWarmups;
  for (const bench of benchData.bench) {
    if (bench.skip) {
      continue;
    }
    const sourceMap = await SourceMapFromJSON(bench.mappings);
    const serialPort = '/dev/cu.usbserial-8952FFEE8B';
    const fqbn = 'm5stack:esp32:m5stick-c';
    const baudrate = 115200;

    const debuggersDevs: DebugAPI[] = [
      new ControlFlowGraphDBG(
        sourceMap,
        new WasmitoDevVM(sourceMap.wasm.wasmPath),
      ),
      new StepWiseDBG(sourceMap, new WasmitoDevVM(sourceMap.wasm.wasmPath)),
      new ControlFlowGraphDBG(
        sourceMap,
        new WARDuinoDevBackend(sourceMap.wasm.wasmPath),
      ),
      new StepWiseDBG(
        sourceMap,
        new WARDuinoDevBackend(sourceMap.wasm.wasmPath),
      ),
    ];

    const debuggersMCU: DebugAPI[] = [
      new ControlFlowGraphDBG(
        sourceMap,
        new WARDuinoBackendMCU(
          sourceMap.wasm.wasmPath,
          serialPort,
          fqbn,
          baudrate,
        ),
      ),
      new StepWiseDBG(
        sourceMap,
        new WARDuinoBackendMCU(
          sourceMap.wasm.wasmPath,
          serialPort,
          fqbn,
          baudrate,
        ),
      ),
      // TODO WamsitoBackend fails after a number of runs
      // tmp deactivated
      // new StepWiseDBG(
      //   sourceMap,
      //   new WasmitoBackendMCUVM(
      //     sourceMap.wasm.wasmPath,
      //     serialPort,
      //     fqbn,
      //     baudrate,
      //   ),
      // ),
      // new ControlFlowGraphDBG(
      //   sourceMap,
      //   new WasmitoBackendMCUVM(
      //     sourceMap.wasm.wasmPath,
      //     serialPort,
      //     fqbn,
      //     baudrate,
      //   ),
      // ),
    ];
    const debuggers = [];
    debuggers.push(...debuggersDevs);
    debuggers.push(...debuggersMCU);

    const exampleOutput = path.join(benchData.results, bench.outputDir);
    for (let opIdx = 0; opIdx < bench.operations.length; opIdx++) {
      const operation = bench.operations[opIdx];
      if (operation.skip) {
        continue;
      }
      for (const dbg of debuggers) {
        const runtimeOutput = path.join(exampleOutput, dbg.runtime.runtimeName);
        fs.mkdirSync(runtimeOutput, { recursive: true });
        const outputFile = path.join(
          runtimeOutput,
          `${opIdx}_${operation.operation}_${dbg.debuggerName}_${dbg.runtime.runtimeName}.csv`,
        );
        const benchConfig: BenchConfig = {
          nrOfRuns,
          nrOfWarmups,
          outputFile,
          dbgOperationName: operation.operation,
        };
        const l: SourceCodeLocation = {
          source: path.basename(operation.startLocation.source),
          linenr: operation.startLocation.linenr,
          colnr: operation.startLocation.colnr,
          name: operation.startLocation.name,
          address: operation.startLocation.address,
        };
        console.log(
          `Running Bench: '${operation.description}' (${dbg.debuggerName}, ${dbg.runtime.runtimeName}) start location ${sourceCodeLocationToString(l)} `,
        );
        await dbg.startDebugger(100000);
        switch (operation.operation) {
          case BenchDBGOperation.stepInto: {
            await benchStepInto(benchConfig, operation.startLocation, dbg);
            break;
          }
          case BenchDBGOperation.stepOver: {
            await benchStepOver(
              benchConfig,
              operation.startLocation,
              dbg,
              operation.endAddress,
            );
            break;
          }
          case BenchDBGOperation.stepOut: {
            await benchStepOut(
              benchConfig,
              operation.startLocation,
              dbg,
              operation.endAddress,
            );
            break;
          }
          default: {
            await dbg.stopDebugger(100000);
            throw new Error(`provided an unsupported debug operation`);
          }
        }
        await dbg.stopDebugger(100000);
      }
    }
  }
}

bench().catch(console.error);
