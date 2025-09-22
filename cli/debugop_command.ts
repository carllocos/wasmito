import { Argument, type Command } from 'commander';
import {
  getAbsolutePath,
  isAbsolutePath,
  isFilePath,
} from '../src/util/file_util';
import {
  DebugStandard,
  readSourceMap,
  SourceMapFromJSON,
} from '../src/source_mappers/source_map_builder';
import { constructLanguageAdaptor } from '../src/language_adaptors/language_adaptor';
import { timeoutPromise } from '../src/util/promise_util';
import { getGlobalLogger } from '../src/logger/logger';
import {
  sourceCodeLocationToString,
  type SourceMap,
} from '../src/source_mappers/source_map';
import { DebugOperationFromName } from '../src/language_adaptors/debug_operations';
import { type SourceCFGNode } from '../src/cfg/source_cfg';
import { writeFileSync } from 'fs';
import {
  DefaultColumnStartNumber,
  DefaultLineStartNumber,
  SourceMapConfig,
} from '../src/source_mappers/source_map_config';

export function registerDebugOpCommand(program: Command): void {
  program
    .command('dbgop')
    .description(`Apply a debug operation`)
    .addArgument(
      new Argument(
        '<operation-name>',
        'the debug operation to apply on the CFG',
      ).choices(['step-into', 'step-over', 'step-out', 'step-iteration']),
    )
    .argument(
      '<wasm-path>',
      'the wasm for which the debug operation needs to be applied',
    )
    .option(
      '-l, --start-location <sourcelocation...>',
      'the line nr and optional column nr from where to apply the debug operation',
    )
    .option(
      '-a, --start-address <wasm-address>',
      'the starting Wasm address from where to apply the debug operation',
    )
    .option(
      '-o, --output <output.json>',
      'the location where to output the destination nodes',
      'current directory',
    )
    .option(
      '-w, --wasmito-json <wasmito-sourcemap-json>',
      `use as debugging format wasmito internal debugging format`,
    )
    .option(
      '-d, --dwarf [dwarf-path]',
      `reads the DWARF debugging information from either 'dwarf-path' or 'wasm-path'.`,
    )
    .option(
      '-s, --source-spec <path-to-source-spec>',
      `reads the debugging information from the given file that points to a SourceMap Spec
      of the given wasm module iteself.`,
    )
    .option(
      '-t, --timeout <timeout-secs>',
      'the maximum seconds allocated to the build of the CFGs',
      '180',
    )
    .action(async (operationName, wasmPath, options) => {
      const logger = getGlobalLogger();
      const wasmAddressArg = options.startAddress;
      const slArgs: string[] = options.startLocation ?? [];
      if (slArgs.length === 0 && wasmAddressArg === undefined) {
        program.error(
          '--start-location or --start-address is required to apply the debug operation',
        );
      }

      if (
        options.startLocation !== undefined &&
        (slArgs.length < 2 || slArgs.length > 3)
      ) {
        program.error(
          '--start-location expects maximum three arguments the sourcefile, line-nr and optional column-nr',
        );
      }
      let sourceFile: string = '';
      const startSourceLocation: number[] = [];
      for (let i = 0; i < slArgs.length; i++) {
        if (i === 0) {
          sourceFile = slArgs[0];
        } else {
          const arg = slArgs[i];
          const n = Number(arg);
          if (isNaN(n)) {
            program.error(
              `--start-location arguments should only be numbers. Given ${arg}`,
            );
          } else {
            startSourceLocation.push(n);
          }
        }
      }

      const startWasmAddress = Number(wasmAddressArg);
      if (wasmAddressArg !== undefined && isNaN(startWasmAddress)) {
        program.error(
          `--start-address should be a number. Given ${wasmAddressArg}`,
        );
      }
      if (!isFilePath(wasmPath)) {
        program.error('<wasm-path> is not a valid path to a Wasm module');
      }

      const timeoutMs = Number(options.timeout) * 1000; // convert to millisecs
      if (isNaN(timeoutMs) || timeoutMs < 0) {
        program.error('`<timeout-secs>` is not a positive number');
      }

      let wasmitoPath = options.wasmitoJson;
      let dwarfPath = options.dwarf;
      let sourceSpecPath = options.sourceSpec;
      if (dwarfPath !== undefined) {
        if (typeof dwarfPath === 'boolean') {
          dwarfPath = wasmPath;
        } else if (!isFilePath(dwarfPath)) {
          program.error(
            '--dwarf <dwarf-path> is not a valid path to a Wasm module containing dwarf',
          );
        }
      } else if (sourceSpecPath !== undefined && !isFilePath(sourceSpecPath)) {
        program.error(
          '--source-spec <path-to-source-spec> is not a valid path to a file',
        );
      } else if (wasmitoPath !== undefined && !isFilePath(wasmitoPath)) {
        program.error(
          '--wasmito-json <wasmito-sourcemap-json> is not a valid path',
        );
      } else if (
        sourceSpecPath === undefined &&
        dwarfPath === undefined &&
        wasmitoPath === undefined
      ) {
        program.error(
          'At least one debugging format should be chosen: either --wasmito-json, --dwarf, or --source-spec is missing',
        );
      }

      let smPromise: Promise<SourceMap> | undefined;
      if (wasmitoPath !== undefined) {
        wasmitoPath = getAbsolutePath(wasmitoPath);
        smPromise = SourceMapFromJSON(wasmitoPath);
      } else if (dwarfPath !== undefined) {
        dwarfPath = getAbsolutePath(dwarfPath);
        smPromise = readSourceMap(DebugStandard.DWARF, wasmPath, dwarfPath);
      } else {
        sourceSpecPath = getAbsolutePath(sourceSpecPath);
        const config: SourceMapConfig = {
          colNrStartNumber: DefaultColumnStartNumber,
          lineNrStartNumber: DefaultLineStartNumber,
        };
        smPromise = readSourceMap(
          DebugStandard.SourceMapSpec,
          wasmPath,
          sourceSpecPath,
          config,
        );
      }
      try {
        logger.info(`Parsing Wasm Module`);
        const startTimeParse = Date.now();
        const sm = await timeoutPromise(smPromise, timeoutMs);
        const endTimeParse = Date.now();
        const diffParse = endTimeParse - startTimeParse;
        logger.info(
          `Parse Time Took ${diffParse} ms, ${diffParse / 1000} secs, ${diffParse / 1000 / 60} mins`,
        );
        logger.info(`Starting construction CFGs`);
        const startTime = Date.now();
        const langAdaptor = await timeoutPromise(
          constructLanguageAdaptor(sm),
          timeoutMs,
        );
        const endTime = Date.now();
        if (langAdaptor.sourceCFG === undefined) {
          logger.error(`Failed to build Source CFGs`);
          program.error(`Failed to build Source CFGs`);
        }
        const diff = endTime - startTime;
        logger.info(
          `Construction Time Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
        );
        const startNodes: SourceCFGNode[] = [];
        if (!isNaN(startWasmAddress)) {
          const startNode =
            langAdaptor.sourceCFG.nodesFromAddress(startWasmAddress);
          if (startNode === undefined) {
            program.error(
              `No Source location found associated with wasm address ${startWasmAddress}`,
            );
          }
          startNodes.push(startNode);
        } else {
          if (!isAbsolutePath(sourceFile)) {
            const candidateFiles = sm.sources.filter((s) => {
              return s.endsWith(sourceFile);
            });
            if (candidateFiles.length > 1) {
              program.error(
                `Multiple source files found with name ${sourceFile}`,
              );
            } else if (candidateFiles.length === 0) {
              program.error(
                `Did not find source file '${sourceFile}' in the source mappings`,
              );
            } else {
              sourceFile = candidateFiles[0];
            }
          }

          const linenr = startSourceLocation[0];
          const colnr = startSourceLocation[1];
          const nodesFound = langAdaptor.sourceCFG.nodesFromSourceLoc({
            source: sourceFile,
            linenr,
            colnr,
            name: '',
            address: -1,
          });
          if (nodesFound.length === 0) {
            program.error(
              `No source location found for (source ${sourceFile},linenr ${linenr}, colnr ${colnr})`,
            );
          }
          nodesFound.forEach((nf) => startNodes.push(nf));
        }

        const debugOp = DebugOperationFromName(operationName);
        if (debugOp === undefined) {
          program.error(`No debug operation found with name ${operationName})`);
        } else {
          const results: Array<
            [SourceCFGNode, Array<[SourceCFGNode, number]>]
          > = [];
          for (const startNode of startNodes) {
            const destinationNodes = debugOp(langAdaptor.sourceCFG, startNode);
            const outputLog: string[] = [
              `Found #${destinationNodes.length} Destination Nodes when applying ${operationName} to ${sourceCodeLocationToString(startNode.sourceLocation)}:`,
            ];
            for (const [dn, addr] of destinationNodes) {
              outputLog.push(
                `-> ${sourceCodeLocationToString(dn.sourceLocation)} add breakpoint at address ${addr}`,
              );
            }
            logger.info(outputLog.join('\n'));
            results.push([startNode, destinationNodes]);
          }

          if (options.output !== undefined) {
            writeAsJSON(options.output, operationName, results);
          }
        }
      } catch (e) {
        const errMsg = e instanceof Error ? `${e.message}${e.stack ?? ''}` : e;
        program.error(`Could not build CFGs error occured: ${errMsg}`);
      }
    });
}

function writeAsJSON(
  output: string,
  operationName: string,
  startAndDestinationNodes: Array<
    [SourceCFGNode, Array<[SourceCFGNode, number]>]
  >,
): void {
  const results: object[] = [];
  for (const [startNode, destinationNodes] of startAndDestinationNodes) {
    const dn: object[] = [];
    for (const [n, a] of destinationNodes) {
      dn.push({
        destination: n.sourceLocation,
        bpAdress: a,
      });
    }
    const obj: object = {
      startNode: startNode.sourceLocation,
      destinationNodes: dn,
    };
    results.push(obj);
  }

  const resultObj: object = {
    operation: operationName,
    results,
  };

  writeFileSync(output, JSON.stringify(resultObj));
}
