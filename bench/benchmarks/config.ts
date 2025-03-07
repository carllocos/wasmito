import { readFileSync } from 'fs';
import { type SourceCodeLocation } from '../../src/source_mappers/source_map';
import path, { isAbsolute } from 'path';
import { isFilePath } from '../../src/util/file_util';

export interface BenchConfig {
  outputFile: string;
  nrOfRuns: number;
  nrOfWarmups: number;
  dbgOperationName: string;
}

export interface BenchOperation {
  operation: BenchDBGOperation;
  description: string;
  startLocation: SourceCodeLocation;
  endAddress?: number[];
  skip: boolean;
}

export interface BenchScenario {
  wasm: string;
  mappings: string;
  operations: BenchOperation[];
  outputDir: string;
  skip: boolean;
}

export interface BenchData {
  nrOfRuns: number;
  nrOfWarmups: number;
  bench: BenchScenario[];
  results: string;
}

export function readBenchDataFile(benchFile: string): BenchData {
  const content: Buffer = readFileSync(benchFile);
  const data: BenchData = JSON.parse(content.toString());
  if (!isAbsolute(data.results)) {
    data.results = path.join(path.resolve('bench'), data.results);
  }
  const bench: BenchScenario[] = [];
  for (const b of data.bench) {
    b.skip = doSkip(b.skip);
    if (!b.skip) {
      resolvePaths(b);
      const ops: BenchOperation[] = [];
      for (const op of b.operations) {
        op.skip = doSkip(op.skip);
        if (!doSkip(op.skip)) {
          op.operation = validateDebugOperation(op.operation);
          op.startLocation = fixSourceLocation(op.startLocation);
        }
        if (op.description === undefined) {
          op.description = op.operation;
        }
        ops.push(op);
      }
      b.operations = ops;
      b.outputDir = path.basename(b.wasm, '.wasm');
    }
    bench.push(b);
  }
  data.bench = bench;
  return data;
}

export enum BenchDBGOperation {
  stepInto = 'stepInto',
  stepOver = 'stepOver',
  stepOut = 'stepOut',
}

function validateDebugOperation(operation: string): BenchDBGOperation {
  switch (operation) {
    case 'stepInto':
      return BenchDBGOperation.stepInto;
    case 'stepOver':
      return BenchDBGOperation.stepOver;
    case 'stepOut':
      return BenchDBGOperation.stepOut;
    default:
      throw new Error(`Provided unsupported debug operation ${operation}`);
  }
}

function resolvePaths(b: BenchScenario): void {
  if (!isAbsolute(b.wasm)) {
    b.wasm = path.join(path.resolve('bench/data'), b.wasm);
  }
  if (!isFilePath(b.wasm)) {
    throw new Error(`Could not find wasm ${b.wasm}`);
  }

  if (!isAbsolute(b.mappings)) {
    b.mappings = path.join(path.resolve('bench/data'), b.mappings);
  }
  if (!isFilePath(b.mappings)) {
    throw new Error(`Could not find mappings ${b.mappings}`);
  }
}

function fixSourceLocation(loc: any): SourceCodeLocation {
  if (typeof loc !== 'object') {
    throw new Error(
      `expected an object for sourcecode location given ${typeof loc}`,
    );
  }

  const l: SourceCodeLocation = {
    linenr: -1,
    colnr: -1,
    address: -1,
    source: '',
    name: '',
  };

  if (typeof loc.source !== 'string') {
    throw new Error(`source of location is supposed to be a string`);
  } else if (!isAbsolute(loc.source)) {
    loc.source = path.join(path.resolve('bench'), 'data', loc.source);
  }

  if (!isFilePath(loc.source)) {
    throw new Error(`Could not find source ${loc.source}`);
  } else {
    l.source = loc.source;
  }

  if (typeof loc.linenr !== 'number') {
    throw new Error(`linenr of location is supposed to be a number`);
  } else {
    l.linenr = loc.linenr;
  }

  if (typeof loc.colnr !== 'number') {
    throw new Error(`colnr of location is supposed to be a number`);
  } else {
    l.colnr = loc.colnr;
  }

  if (loc.address !== undefined) {
    if (typeof loc.address !== 'number') {
      throw new Error(`address of location is supposed to be a number`);
    }
    l.address = loc.address;
  }
  return l;
}

function doSkip(op: any): boolean {
  if (op === undefined) {
    return false;
  }

  if (typeof op !== 'boolean') {
    throw new Error(`operation is expected to be a boolean`);
  }
  return op;
}
