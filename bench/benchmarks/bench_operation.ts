import * as fs from 'fs';
import { type SourceCodeLocation } from '../../src/source_mappers/source_map';
import { type DebugAPI } from '../debuggers/debug_api';
import { type BenchConfig } from './config';
import { stepUntilLineCol } from './step_until';
import path from 'path';

const csvHeader = [
  'operation',
  'start_source',
  'start_line',
  'start_col',
  'start_addr',
  'end_source',
  'end_line',
  'end_col',
  'end_addr',
  'time_ms',
];
export async function benchOperation(
  config: BenchConfig,
  startLoc: SourceCodeLocation,
  dbg: DebugAPI,
  operation: (
    loc: SourceCodeLocation,
    timeout?: number,
  ) => Promise<SourceCodeLocation>,
  stepUntilStartLocTimeout: number,
  operationTimeout: number,
): Promise<void> {
  const measures: any[] = [];
  const lapses: number[] = [];
  let warmupIdx = 0;
  let headerWritten = false;
  for (let idx = 0; idx < config.nrOfRuns + config.nrOfWarmups; idx++) {
    console.log(
      `[${idx + 1}\\${config.nrOfRuns + config.nrOfWarmups}] Running until (${startLoc.linenr}, ${startLoc.colnr}) ...`,
    );
    const [loc] = await stepUntilLineCol(
      startLoc,
      dbg,
      stepUntilStartLocTimeout,
    );
    const startTime = performance.now();
    const nextLoc = await operation(loc, operationTimeout);
    const endTime = performance.now();
    const lapse = endTime - startTime;
    if (warmupIdx < config.nrOfWarmups) {
      warmupIdx++;
      console.log(
        `[${idx + 1}\\${config.nrOfWarmups}] Warmup -  ${config.dbgOperationName} - took ${lapse} ms`,
      );
      continue;
    }

    const row = [
      config.dbgOperationName,
      path.basename(startLoc.source),
      startLoc.linenr,
      startLoc.colnr,
      startLoc.address,
      path.basename(nextLoc.source),
      nextLoc.linenr,
      nextLoc.colnr,
      nextLoc.address,
      lapse,
    ];

    measures.push(row);
    lapses.push(lapse);
    console.log(
      `[${idx + 1}\\${config.nrOfRuns + config.nrOfWarmups}] ${config.dbgOperationName} - took ${lapse} ms`,
    );

    const data = [];
    if (!headerWritten) {
      data.push(csvHeader.join(','));
      data.push(row.join(','));
      headerWritten = true;
    } else {
      data.push(`\n${row.join(',')}`);
    }

    // const csvData = data.map((r) => r.join(',')).join('\n');
    const csvData = data.join('\n');
    fs.writeFile(config.outputFile, csvData, { flag: 'a+' }, (err) => {
      if (err !== undefined && err !== null) {
        console.error(`Failed to write to ${config.outputFile}`, err);
      }
    });
  }

  const min = Math.min(...lapses);
  const max = Math.max(...lapses);
  const sum = lapses.reduce((acc, num) => acc + num, 0);
  const avg = sum / lapses.length;
  console.log(`${config.dbgOperationName}`);
  console.log(`min time: ${min} ms`);
  console.log(`max time: ${max} ms`);
  console.log(`average time: ${avg} ms`);
}
