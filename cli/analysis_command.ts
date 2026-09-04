import { Argument, type Command } from 'commander';
import {
  findFilesWithExtension,
  getFileName,
  isDirectoryPath,
  isFilePath,
} from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import { analyse as analyseCallgraph } from '../tool_examples/analyses/call_graph';
import { analyse as analyseBlocks } from '../tool_examples/analyses/block_profiling';
import { analyse as analyseInstrCoverage } from '../tool_examples/analyses/coverage_instruction';
import { analyse as analyseCryptomining } from '../tool_examples/analyses/cryptominer_detection_shorter';
import { analyse as analyseDenan } from '../tool_examples/analyses/denan';
import { analyse as analyseInstructionMix } from '../tool_examples/analyses/instruction_mix';
import { analyse as analyseMemoryTracing } from '../tool_examples/analyses/memory_tracing';
import { analyse as analyseSafeHeap } from '../tool_examples/analyses/safe_heap';
import { analyse as analyseNone } from '../tool_examples/analyses/no_analysis';
import {
  TimeoutConfig,
  BenchmarkMeasurement,
  logMeasurement,
  BenchmarkMeasurements,
  writeLastMeasurementToFile,
  FailedMeasurement,
  csvFileHasHeader,
} from '../src/util/benchmark_util';

const logger = getGlobalLogger();

const ALL_ANALYSIS = 'all';
type AnalysisRun = [
  string,
  (wasmPath: string, timeouts: TimeoutConfig) => Promise<BenchmarkMeasurement>,
];
const analyses: Array<AnalysisRun> = [
  [ALL_ANALYSIS, unusedFunc],
  ['no-analysis', analyseNone],
  ['block-profiling', analyseBlocks],
  ['call-graph', analyseCallgraph],
  ['coverage-instruction', analyseInstrCoverage],
  ['cryptomining', analyseCryptomining],
  ['denan', analyseDenan],
  ['instruction-mix', analyseInstructionMix],
  ['memory-trace', analyseMemoryTracing],
  ['safe-heap', analyseSafeHeap],
];

async function unusedFunc(
  _wasmPath: string,
  _timeouts: TimeoutConfig,
): Promise<BenchmarkMeasurement> {
  throw new Error(`unused function`);
}

const analysisNames: string[] = analyses.map((v) => v[0]);
export function registerAnalysisCommand(program: Command): void {
  program
    .command('analysis')
    .description(`Run an analysis on the given Wasm module`)
    .addArgument(
      new Argument('<analysis>', 'the analysis to apply on the Wasm').choices(
        analysisNames,
      ),
    )
    .argument(
      '<wasm>',
      'one wasm module or directory containing modules for which to run the analysis',
    )
    .option(
      '-n,--nr-runs <nr of runs>',
      `The number of runs for the analysis`,
      '3',
    )
    .option(
      '-w,--warmup-runs <nr of warmup runs>',
      `The number of warm runs for the analysis`,
      '1',
    )
    .option(
      '--csv <csv_file_path>',
      `Path to where to store the results`,
      'measurements.csv',
    )
    .option(
      '--tr,--timeout-register <seconds>',
      `Timeout in seconds for the register of hooks`,
      '30',
    )
    .option(
      '--td,--timeout-deploy <seconds>',
      `Timeout in seconds for the deploy of hooks`,
      '30',
    )
    .option(
      '--te,--timeout-execution <seconds>',
      `Timeout in seconds for the execution of the analysis`,
      '30',
    )
    .action(async (analysis, wasm, options) => {
      const [modules, errMsg] = findModules(wasm);
      if (errMsg !== '') {
        program.error(errMsg);
      }

      const analysisToRun = readAnalyses(analysis);
      logger.info(
        `running analysis '${analysisToRun.map((a) => a[0]).join(', ')}' on modules: ${modules.join(', ')}`,
      );

      const csvFilePath = options.csv;
      const nrOfRuns = Number(options.nrRuns);
      if (isNaN(nrOfRuns) || nrOfRuns < 0)
        program.error('nr of runs is not a valid number');
      const nrOfWarmups = Number(options.warmupRuns);
      if (isNaN(nrOfWarmups) || nrOfWarmups >= nrOfRuns)
        program.error('nr of warmups is not a valid number');
      const timeoutMsRegisterAdvices = Number(options.timeoutRegister) * 1000;
      const timeoutMsDeployAdvices = Number(options.timeoutDeploy) * 1000;
      const timeoutMsAnalysisRun = Number(options.timeoutExecution) * 1000;
      if (
        isNaN(timeoutMsRegisterAdvices) ||
        isNaN(timeoutMsRegisterAdvices) ||
        isNaN(timeoutMsAnalysisRun)
      )
        program.error('timeout is not a number');
      const timeouts: TimeoutConfig = {
        timeoutMsRegisterAdvices: timeoutMsRegisterAdvices,
        timeoutMsDeploy: timeoutMsDeployAdvices,
        timeoutMsAnalysisRun: timeoutMsAnalysisRun,
      };

      logger.info(
        `nr of runs ${nrOfRuns}, nr of warmup ${nrOfWarmups}, advice registration timeout ms ${timeouts.timeoutMsRegisterAdvices}, advice deployment timeout ms ${timeouts.timeoutMsDeploy}, analysis execution timeout ms ${timeouts.timeoutMsAnalysisRun}`,
      );

      let addHeader = !csvFileHasHeader(csvFilePath);
      for (const [a, analyse] of analysisToRun) {
        for (const wasmPath of modules) {
          const measurements: BenchmarkMeasurements = {
            analysisName: a,
            csvFilePath: csvFilePath,
            wasm: getFileName(wasmPath),
            measurements: [],
            totalTimes: [],
          };
          for (let idx = 0; idx < nrOfRuns; idx++) {
            try {
              if (idx < nrOfWarmups) {
                logger.info(
                  `[WARMUP ${idx + 1}/${nrOfWarmups}] Running analysis '${a}' for wasm '${wasmPath}'`,
                );
              } else {
                logger.info(
                  `[RUN ${idx - nrOfWarmups + 1}/${nrOfRuns - nrOfWarmups}] Running analysis '${a}' for wasm '${wasmPath}'`,
                );
              }
              const startTimeParse = Date.now();
              const run = await analyse(wasmPath, timeouts);
              const totalTime = logMeasurement(
                logger,
                startTimeParse,
                Date.now(),
                `Analysis ${a} Total Time`,
              );
              if (idx >= nrOfWarmups) {
                measurements.measurements.push(run);
                measurements.totalTimes.push(totalTime);
                try {
                  writeLastMeasurementToFile(measurements, addHeader);
                  addHeader = false;
                } catch (err) {
                  logger.error(
                    `Error writing to file ${measurements.csvFilePath}. ${err}`,
                  );
                }
              }
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : e;
              const failedMeasument: FailedMeasurement = {
                errorParsing: '',
                errorRegister: '',
                errorDeploy: '',
                errorRun: `${errMsg}`,
              };
              measurements.measurements.push(failedMeasument);
              measurements.totalTimes.push(-100);
              writeLastMeasurementToFile(measurements, addHeader);
              addHeader = false;
              break;
            }
          }
        }
      }
    });
}

function findModules(path: string): [string[], string] {
  const modules: string[] = [];
  if (isFilePath(path)) {
    modules.push(path);
  } else if (isDirectoryPath(path)) {
    // find all Wasm modules in directory
    const modulesFound = findFilesWithExtension(path, 'wasm');
    modulesFound.forEach((m) => modules.push(m));
  } else {
    return [
      modules,
      `provided path should be a directory or wasm module. Given '${path}'`,
    ];
  }

  return [modules, ''];
}

function readAnalyses(analyse: string): AnalysisRun[] {
  const includeAll = analyse === ALL_ANALYSIS;
  const toRun: AnalysisRun[] = [];
  for (const [a, cb] of analyses) {
    if (includeAll || a === analyse) {
      if (a === ALL_ANALYSIS) continue;
      toRun.push([a, cb]);
    }
  }

  return toRun;
}
