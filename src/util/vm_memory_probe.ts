import { execFileSync, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Logger } from '../logger/logger';

/*
 * Memory used by a spawned (development) VM process, as reported by the
 * `time` command once the VM exits:
 *   - Linux: /usr/bin/time -v ("Maximum resident set size (kbytes): N")
 *   - macOS: /usr/bin/time -l ("N  maximum resident set size", in bytes)
 */
export interface VMMemoryMeasurement {
  maxResidentSetKBytes?: number;
}

const TIME_BIN = '/usr/bin/time';

/*
 * When enabled (VMMemoryProbe.enable()), every development VM that gets
 * spawned is wrapped in `time`, which writes its report to a temporary file
 * when the VM exits. As killing the VM would otherwise kill `time` (the
 * spawned process), `kill` signals the VM, i.e., the child of `time`, so that
 * `time` still writes its report.
 */
export class VMMemoryProbe {
  private static active?: VMMemoryProbe;
  private static counter = 0;

  private readonly wrapped = new Map<
    ChildProcess,
    Promise<VMMemoryMeasurement>
  >();
  private last?: Promise<VMMemoryMeasurement>;

  static enable(): VMMemoryProbe {
    if (VMMemoryProbe.active === undefined) {
      if (!fs.existsSync(TIME_BIN)) {
        throw new Error(`cannot measure the VM memory: ${TIME_BIN} not found`);
      }
      VMMemoryProbe.active = new VMMemoryProbe();
    }
    return VMMemoryProbe.active;
  }

  static get current(): VMMemoryProbe | undefined {
    return VMMemoryProbe.active;
  }

  /* The command and arguments that run `command args` under `time`. */
  wrapCommand(
    command: string,
    args: string[],
  ): { command: string; args: string[]; reportFile: string } {
    const reportFile = path.join(
      os.tmpdir(),
      `wasmito-vm-memory-${process.pid}-${VMMemoryProbe.counter++}.txt`,
    );
    const verbose = os.platform() === 'darwin' ? '-l' : '-v';
    return {
      command: TIME_BIN,
      args: [verbose, '-o', reportFile, command, ...args],
      reportFile,
    };
  }

  /* Reads the report of `time` once the wrapped process exits. */
  track(child: ChildProcess, reportFile: string): void {
    const measurement = new Promise<VMMemoryMeasurement>((resolve) => {
      child.on('exit', () => {
        let report = '';
        try {
          report = fs.readFileSync(reportFile, 'utf-8');
          fs.rmSync(reportFile, { force: true });
        } catch {
          // no report, e.g. `time` itself was killed
        }
        resolve({ maxResidentSetKBytes: parseMaxResidentSetKBytes(report) });
      });
    });
    this.wrapped.set(child, measurement);
    this.last = measurement;
  }

  /*
   * Kills the VM of a process spawned through `wrapCommand`: signals the
   * children of `time` rather than `time` itself. Other processes are
   * killed as usual.
   */
  kill(child: ChildProcess): boolean {
    if (!this.wrapped.has(child) || child.pid === undefined) {
      return child.kill();
    }
    if (child.exitCode !== null || child.signalCode !== null) return true;
    const vmPids = childPids(child.pid);
    if (vmPids.length === 0) return child.kill();
    for (const pid of vmPids) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // already exited
      }
    }
    return true;
  }

  /*
   * The measurement of the last spawned VM, once it exited, or an empty
   * measurement if it did not exit within `timeoutMs`.
   */
  async collect(
    timeoutMs: number,
    logger?: Logger,
  ): Promise<VMMemoryMeasurement> {
    const last = this.last;
    this.last = undefined;
    if (last === undefined) return {};
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<VMMemoryMeasurement>((resolve) => {
      timer = setTimeout(() => {
        logger?.error(
          `VM did not exit within ${timeoutMs} ms: no memory measurement`,
        );
        resolve({});
      }, timeoutMs);
    });
    const m = await Promise.race([last, timeout]);
    clearTimeout(timer);
    return m;
  }
}

/* Kills a VM process, through the active VMMemoryProbe if any. */
export function killVMProcess(child: ChildProcess): boolean {
  return VMMemoryProbe.current?.kill(child) ?? child.kill();
}

function childPids(pid: number): number[] {
  try {
    return execFileSync('pgrep', ['-P', `${pid}`], { encoding: 'utf-8' })
      .split('\n')
      .map((l) => Number(l.trim()))
      .filter((p) => Number.isInteger(p) && p > 0);
  } catch {
    return []; // pgrep exits with 1 when there is no child
  }
}

export function parseMaxResidentSetKBytes(report: string): number | undefined {
  const linux = report.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  if (linux) return Number(linux[1]);
  const macos = report.match(/(\d+)\s+maximum resident set size/);
  if (macos) return Math.round(Number(macos[1]) / 1024);
  return undefined;
}

export function logVMMemory(
  logger: Logger,
  label: string,
  m: VMMemoryMeasurement,
): void {
  logger.info(
    `${label} VM maximum resident set size (kbytes): ${m.maxResidentSetKBytes}`,
  );
}

const vmMemoryCsvHeader = ['analysis', 'wasm', 'status', 'max_rss_kbytes'];

export function vmMemoryCsvFileHasHeader(csvFilePath: string): boolean {
  if (!fs.existsSync(csvFilePath)) return false;
  const firstLine = fs.readFileSync(csvFilePath, 'utf-8').split('\n')[0];
  return firstLine.trim() === vmMemoryCsvHeader.join(',');
}

/* Appends a row (analysis, wasm, status ok|error, max RSS in KiB) to the CSV. */
export function writeVMMemoryToFile(
  csvFilePath: string,
  analysisName: string,
  wasm: string,
  status: 'ok' | 'error',
  m: VMMemoryMeasurement,
  addHeader: boolean,
): void {
  const dir = path.dirname(csvFilePath);
  if (dir !== '' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const row = [analysisName, wasm, status, m.maxResidentSetKBytes ?? ''];
  const header = addHeader ? `${vmMemoryCsvHeader.join(',')}\n` : '';
  fs.appendFileSync(csvFilePath, `${header}${row.join(',')}\n`);
}
