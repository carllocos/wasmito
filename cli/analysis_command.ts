import { Argument, type Command } from 'commander';
import {
  findFilesWithExtension,
  getFileName,
  isDirectoryPath,
  isFilePath,
} from '../src/util/file_util';
import { getGlobalLogger } from '../src/logger/logger';
import {
  DebugStandard,
  readSourceMap,
  SourceMapFromJSON,
} from '../src/source_mappers/source_map_builder';
import { SourceMap } from '../src/source_mappers/source_map';
import { analyse as analyseCallgraph } from '../tool_examples/analyses/call_graph';
import { analyse as analyseBlocks } from '../tool_examples/analyses/block_profiling';
import { analyse as analyseInstrCoverage } from '../tool_examples/analyses/coverage_instruction';
import { analyse as analyseCryptomining } from '../tool_examples/analyses/cryptominer_detection_shorter';
import { analyse as analyseDenan } from '../tool_examples/analyses/denan';
import { analyse as analyseInstructionMix } from '../tool_examples/analyses/instruction_mix';
import { analyse as analyseMemoryTracing } from '../tool_examples/analyses/memory_tracing';
import { analyse as analyseSafeHeap } from '../tool_examples/analyses/safe_heap';
import { analyse as analyseNone } from '../tool_examples/analyses/no_analysis';
import { analyse as analyseBranches } from '../tool_examples/analyses/branches';
import { analyse as anaylseInstrCounts } from '../tool_examples/analyses/instruction_count';
import { analyse as analyseHotness } from '../tool_examples/analyses/hotness';
import { analyse as analyseIMix } from '../tool_examples/analyses/imix';
import { analyse as analyseCacheSim } from '../tool_examples/analyses/cache_simulator/cache_simulator';
import { analyse as analyseLoopTracer } from '../tool_examples/analyses/loop_tracer/loop_tracer';
import { analyse as analyseDataRaceViolation } from '../tool_examples/concurrency_guard/data_race_violation';
import { analyse as analyseOrderViolation } from '../tool_examples/concurrency_guard/order_violation';
import { analyse as analyseVariableViolation } from '../tool_examples/concurrency_guard/variable_violation';
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
  (
    wasmPath: string,
    timeouts: TimeoutConfig,
    loadSourceMap?: () => Promise<SourceMap>,
  ) => Promise<BenchmarkMeasurement>,
];
const analyses: Array<AnalysisRun> = [
  [ALL_ANALYSIS, unusedFunc],
  ['no-analysis', analyseNone],
  ['branches', analyseBranches],
  ['icount', anaylseInstrCounts],
  ['imix', analyseIMix],
  ['hotness', analyseHotness],
  ['cache_sim', analyseCacheSim],
  ['mem_access', analyseMemoryTracing],
  ['loop_tracer', analyseLoopTracer],
  ['basic-block', analyseBlocks],
  ['instr-coverage', analyseInstrCoverage],
  ['call-graph', analyseCallgraph],
  ['cryptomining', analyseCryptomining],
  ['denan', analyseDenan],
  ['instruction-mix', analyseInstructionMix],
  ['safe-heap', analyseSafeHeap],
  ['data-race-violation', analyseDataRaceViolation],
  ['order-violation', analyseOrderViolation],
  ['variable-violation', analyseVariableViolation],
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
    .option('--csv <csv_file_path>', `Path to where to store the results`)
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
    .option(
      '-d, --dwarf [dwarf-path]',
      `reads the DWARF debugging information from either the path to a DWARF encoded file or, if the argument is omitted, from the wasm module itself.`,
    )
    .option(
      '-w, --wasmito-json <path-to-wasmito-sourcemap-json>',
      `read the debugging information from the json file which follows wasmito's internal debugging format.`,
    )
    .option(
      '-s, --source-spec <path-to-source-spec>',
      `read the debugging information from the given path to a Source Map Spec.`,
    )
    .action(async (analysis, wasm, options) => {
      const [modules, errMsg] = findModules(wasm);
      if (errMsg !== '') {
        program.error(errMsg);
      }

      let loadSourceMap: (() => Promise<SourceMap>) | undefined;
      const enabledFormats = [
        !!options.wasmitoJson,
        !!options.dwarf,
        !!options.sourceSpec,
      ];
      if (enabledFormats.filter((enabled) => enabled).length > 1) {
        program.error(
          'only one debugging format expected. Choose --source-spec, --dwarf, or --wasmito-json',
        );
      } else if (
        enabledFormats.some((enabled) => enabled) &&
        !isFilePath(wasm)
      ) {
        program.error(
          'debugging information can only be provided when <wasm> is a path to a single wasm module',
        );
      } else if (options.wasmitoJson !== undefined) {
        if (!isFilePath(options.wasmitoJson)) {
          program.error(
            '`the <path-to-wasmito-sourcemap-json> is not a path to a file',
          );
        }
        loadSourceMap = async () => SourceMapFromJSON(options.wasmitoJson);
      } else if (options.dwarf !== undefined) {
        const dwarfPath =
          typeof options.dwarf === 'string' ? options.dwarf : wasm;
        loadSourceMap = () =>
          readSourceMap(DebugStandard.DWARF, wasm, dwarfPath);
      } else if (options.sourceSpec !== undefined) {
        loadSourceMap = () =>
          readSourceMap(DebugStandard.SourceMapSpec, wasm, options.sourceSpec);
      }

      const analysisToRun = readAnalyses(analysis);
      logger.info(
        `running analysis '${analysisToRun.map((a) => a[0]).join(', ')}' on modules: ${modules.join(', ')}`,
      );

      const writeToCSV = options.csv !== undefined;
      const csvFilePath = options.csv;
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
        `advice registration timeout ms ${timeouts.timeoutMsRegisterAdvices}, advice deployment timeout ms ${timeouts.timeoutMsDeploy}, analysis execution timeout ms ${timeouts.timeoutMsAnalysisRun}`,
      );

      let addHeader = writeToCSV ? !csvFileHasHeader(csvFilePath) : false;
      for (const [a, analyse] of analysisToRun) {
        for (const wasmPath of modules) {
          const measurements: BenchmarkMeasurements = {
            analysisName: a,
            csvFilePath: csvFilePath,
            wasm: getFileName(wasmPath),
            measurements: [],
            totalTimes: [],
          };
          try {
            logger.info(`Running analysis '${a}' for wasm '${wasmPath}'`);
            const startTimeParse = Date.now();
            const run = await analyse(wasmPath, timeouts, loadSourceMap);
            const totalTime = logMeasurement(
              logger,
              startTimeParse,
              Date.now(),
              `Analysis ${a} Total Time`,
            );
            measurements.measurements.push(run);
            measurements.totalTimes.push(totalTime);
            if (writeToCSV) {
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
              errorSpawn: '',
              errorRegister: '',
              errorDeploy: '',
              errorRun: `${errMsg}`,
            };
            measurements.measurements.push(failedMeasument);
            measurements.totalTimes.push(-100);
            if (writeToCSV) {
              writeLastMeasurementToFile(measurements, addHeader);
            }
            addHeader = false;
            break;
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
