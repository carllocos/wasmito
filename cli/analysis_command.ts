import { Argument, type Command } from 'commander';
import {
  findFilesWithExtension,
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

const logger = getGlobalLogger();

const ALL_ANALYSIS = 'all';
type AnalysisRun = [string, any];
const analyses: Array<AnalysisRun> = [
  [ALL_ANALYSIS, undefined],
  ['block-profiling', analyseBlocks],
  ['call-graph', analyseCallgraph],
  ['coverage-instruction', analyseInstrCoverage],
  ['cryptomining', analyseCryptomining],
  ['denan', analyseDenan],
  ['instruction-mix', analyseInstructionMix],
  ['memory-trace', analyseMemoryTracing],
  ['safe-heap', analyseSafeHeap],
];

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
    .action(async (analysis, wasm, _options) => {
      const [modules, errMsg] = findModules(wasm);
      if (errMsg !== '') {
        program.error(errMsg);
      }

      const wasmitoPath = undefined;
      const analysisToRun = readAnalyses(analysis);
      logger.info(
        `running analysis '${analysisToRun.map((a) => a[0]).join(', ')}' on modules: ${modules.join(', ')}`,
      );
      for (const [a, run] of analysisToRun) {
        for (const wasmPath of modules) {
          try {
            logger.info(`Running analysis '${a}' for wasm '${wasmPath}'`);
            const startTimeParse = Date.now();
            await run(wasmPath, wasmitoPath);
            const endTimeParse = Date.now();
            const diffParse = endTimeParse - startTimeParse;
            logger.info(
              `Analysis '${a}' Time Took ${diffParse} ms, ${diffParse / 1000} secs, ${diffParse / 1000 / 60} mins`,
            );
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : e;
            program.error(`Could not run analysis error occured: ${errMsg}`);
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
