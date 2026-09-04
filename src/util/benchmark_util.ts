import * as fs from 'fs';
import assert from 'assert';
import { Logger } from '../logger/logger';

export interface TimeoutConfig {
  timeoutMsRegisterAdvices: number;
  timeoutMsDeploy: number;
  timeoutMsAnalysisRun: number;
}

export type BenchmarkMeasurement = SuccessMeasurement | FailedMeasurement;
export interface SuccessMeasurement {
  wasmParsingMs: number;
  advicesRegistrationMs: number;
  advicesDeploymentMs: number;
  analysisRunMs: number;
}

export interface FailedMeasurement {
  errorParsing: string;
  errorRegister: string;
  errorDeploy: string;
  errorRun: string;
}

export function isFailedMeasurement(m: any): m is FailedMeasurement {
  return m.errorParsing !== undefined;
}

export function isSuccessMeasurement(m: any): m is SuccessMeasurement {
  return m.wasmParsingMs !== undefined;
}

export interface BenchmarkMeasurements {
  analysisName: string;
  csvFilePath: string;
  wasm: string;
  measurements: Array<BenchmarkMeasurement | FailedMeasurement>;
  totalTimes: number[];
}

export function logMeasurement(
  logger: Logger,
  start: number,
  end: number,
  msg: string,
): number {
  const diff = end - start;
  logger.info(
    `${msg} Took ${diff} ms, ${diff / 1000} secs, ${diff / 1000 / 60} mins`,
  );
  return diff;
}
const cvsHeader = [
  'analysis',
  'wasm',
  'parsing',
  'register',
  'deploy',
  'run',
  'total',
];

export function csvFileHasHeader(csvFilePath: string): boolean {
  if (!fs.existsSync(csvFilePath)) return false;

  const stat = fs.statSync(csvFilePath);
  if (stat.size === 0) return false;

  const fd = fs.openSync(csvFilePath, 'r');
  const buffer = Buffer.alloc(Math.min(stat.size, 4096));
  const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);

  const firstLine = buffer.toString('utf-8', 0, bytesRead).split('\n')[0];
  return firstLine.trim() === cvsHeader.join(',');
}

export function writeLastMeasurementToFile(
  bms: BenchmarkMeasurements,
  addHeader: boolean,
) {
  assertSizeMeasurements(bms);

  const csvRows: string[] = [];

  if (addHeader) csvRows.push(cvsHeader.join(','));

  const m = bms.measurements[bms.measurements.length - 1];
  const csvRow: string[] = [bms.analysisName, bms.wasm];
  if (isFailedMeasurement(m)) {
    csvRow.push(m.errorParsing, m.errorRegister, m.errorDeploy, m.errorRun);
  } else if (isSuccessMeasurement(m)) {
    csvRow.push(
      `${m.wasmParsingMs}`,
      `${m.advicesRegistrationMs}`,
      `${m.advicesDeploymentMs}`,
      `${m.analysisRunMs}`,
      `${bms.totalTimes[bms.totalTimes.length - 1]}`,
    );
  }
  csvRow.push(`${bms.totalTimes[bms.totalTimes.length - 1]}`);

  csvRows.push(csvRow.join(','));
  let data = csvRows.join('\n');
  if (!addHeader) {
    data = `\n${data}`;
  }
  fs.appendFileSync(bms.csvFilePath, data, 'utf-8');
}

function assertSizeMeasurements(bms: BenchmarkMeasurements) {
  const expectedSize = bms.totalTimes.length;
  assert(
    bms.measurements.length === expectedSize,
    `BenchmarkMeasurement is expected to have #${expectedSize} but has #${bms.measurements.length}`,
  );
}

// export function writeMeasurementFailureToFile(
//   bms: BenchmarkMeasurements,
//   errorMsg: string,
// ) {
//   const addHeader = bms.totalTimes.length <= 1; // first measurement

//   const csvRows: string[] = [];

//   if (addHeader) csvRows.push(cvsHeader.join(','));

//   const csvRow = [bms.analysisName, bms.wasm, errorMsg, '', '', '', ''];

//   csvRows.push(csvRow.join(','));
//   let data = csvRows.join('\n');
//   if (!addHeader) {
//     data = `\n${data}`;
//   }
//   fs.appendFileSync(bms.csvFilePath, data, 'utf-8');
// }
