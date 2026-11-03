import * as fs from 'fs';
import assert from 'assert';
import { WasmitoBackendVM } from '../runtimes/wasmito_vm/wasmito_vm';
import { StateRequest } from '../runtimes/wasmito_vm/requests/inspect_request';
import { Logger } from '../logger/logger';

/*
 * Heap usage of the VM (in bytes) sampled just before and just after the
 * analysis hooks get deployed.
 */
export interface HeapUsageMeasurement {
  heapUsedBeforeDeployBytes?: number;
  heapUsedAfterDeployBytes?: number;
}

/*
 * Optional probe passed to an analysis. The analysis calls `beforeDeploy` and
 * `afterDeploy` *outside* of its timed sections so that the time measurements
 * are not affected. When no probe is passed, nothing is requested from the VM.
 */
export class HeapUsageProbe {
  private readonly _m: HeapUsageMeasurement = {};

  constructor(private readonly timeoutMs?: number) {}

  get measurement(): HeapUsageMeasurement {
    return { ...this._m };
  }

  async beforeDeploy(vm: WasmitoBackendVM): Promise<void> {
    this._m.heapUsedBeforeDeployBytes = await this.readHeapUsed(vm);
  }

  async afterDeploy(vm: WasmitoBackendVM): Promise<void> {
    this._m.heapUsedAfterDeployBytes = await this.readHeapUsed(vm);
  }

  private async readHeapUsed(vm: WasmitoBackendVM): Promise<number> {
    const req = new StateRequest().includeHeapUsed();
    const s = await vm.inspect(req, this.timeoutMs);
    assert(s.heapUsed !== undefined, 'VM did not report heap usage');
    return s.heapUsed;
  }
}

function diff(a?: number, b?: number): number | undefined {
  return a === undefined || b === undefined ? undefined : b - a;
}

export function logHeapUsage(
  logger: Logger,
  label: string,
  m: HeapUsageMeasurement,
): void {
  logger.info(
    `${label} heap used (bytes): before deploy=${m.heapUsedBeforeDeployBytes}, after deploy=${m.heapUsedAfterDeployBytes}, deployment delta=${diff(m.heapUsedBeforeDeployBytes, m.heapUsedAfterDeployBytes)}`,
  );
}

const heapCsvHeader = [
  'analysis',
  'wasm',
  'heap_used_before_deploy',
  'heap_used_after_deploy',
  'deploy_delta',
];

export function heapCsvFileHasHeader(csvFilePath: string): boolean {
  if (!fs.existsSync(csvFilePath)) return false;
  const firstLine = fs.readFileSync(csvFilePath, 'utf-8').split('\n')[0];
  return firstLine.trim() === heapCsvHeader.join(',');
}

export function writeHeapUsageToFile(
  csvFilePath: string,
  analysisName: string,
  wasm: string,
  m: HeapUsageMeasurement,
  addHeader: boolean,
): void {
  const str = (v?: number) => (v === undefined ? '' : `${v}`);
  const row = [
    analysisName,
    wasm,
    str(m.heapUsedBeforeDeployBytes),
    str(m.heapUsedAfterDeployBytes),
    str(diff(m.heapUsedBeforeDeployBytes, m.heapUsedAfterDeployBytes)),
  ].join(',');
  const data = addHeader ? `${heapCsvHeader.join(',')}\n${row}` : `\n${row}`;
  fs.appendFileSync(csvFilePath, data, 'utf-8');
}
