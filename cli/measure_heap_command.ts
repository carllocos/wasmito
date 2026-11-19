import { InvalidArgumentError, type Command } from 'commander';
import { SerialPort } from 'serialport';
import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { getPath2WARDuinoSDK } from '../src/project_config';
import {
  ArduinoClean,
  ArduinoCompile,
  ArduinoFlash,
} from '../src/platforms/arduino_platform';
import {
  copyRecursive,
  createDirectoryIfUnexisting,
} from '../src/util/file_util';

/*
 * `measure-heap` measures how much RAM is left on an MCU for Wasm linear
 * memory once the OS, the Arduino firmware, the WARDuino VM, and a minimal
 * Wasm module are loaded.
 *
 * It flashes WARDuino with generated Wasm modules that only declare `pages`
 * pages of linear memory and run an empty infinite loop in `main`.
 * The flashed sketch is a copy of WARDuino's Arduino template that
 * additionally prints, after the module is loaded and the debugger task is
 * started, the total heap, the free heap, and the largest free block.
 * The latter matters because WARDuino allocates all pages of a linear memory
 * as a single contiguous block (`acalloc(pages * PAGE_SIZE)`).
 *
 * Run 1 uses a module without linear memory (baseline).
 * Subsequent runs declare 1, 2, ... pages until WARDuino fails to allocate
 * the linear memory, which gives the maximum number of pages that fit.
 */

const PAGE_SIZE = 65536;
const MARKER = 'WASMITO_HEAP';
const ALLOC_FAILURE = 'Could not allocate';

interface HeapReport {
  pages: number;
  loaded: boolean;
  bootTotal?: number;
  bootFree?: number;
  bootMaxAlloc?: number;
  total?: number;
  free?: number;
  maxAlloc?: number;
  minFree?: number;
  psram?: number;
  error?: string;
}

function parsePositiveInt(value: string, _prev: any): number {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) {
    throw new InvalidArgumentError('Not a non-negative integer');
  }
  return n;
}

function uLEB128(n: number): number[] {
  const bytes: number[] = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n !== 0) b |= 0x80;
    bytes.push(b);
  } while (n !== 0);
  return bytes;
}

function section(id: number, content: number[]): number[] {
  return [id, ...uLEB128(content.length), ...content];
}

/*
 * Wasm module exporting `main: () -> ()` that loops forever,
 * with a linear memory of `pages` pages (no memory section if 0).
 */
export function minimalWasmModule(pages: number): Buffer {
  const header = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
  const types = section(1, [0x01, 0x60, 0x00, 0x00]);
  const funcs = section(3, [0x01, 0x00]);
  const memory = pages > 0 ? section(5, [0x01, 0x00, ...uLEB128(pages)]) : [];
  const name = Array.from(Buffer.from('main'));
  const exports = section(7, [0x01, name.length, ...name, 0x00, 0x00]);
  // body: no locals; loop (void) br 0 end; end
  const body = [0x00, 0x03, 0x40, 0x0c, 0x00, 0x0b, 0x0b];
  const code = section(10, [0x01, body.length, ...body]);
  return Buffer.from([
    ...header,
    ...types,
    ...funcs,
    ...memory,
    ...exports,
    ...code,
  ]);
}

/*
 * Copy WARDuino's Arduino template into `sketchDir` and patch it so that
 * it prints heap statistics at boot and after the module is loaded.
 */
function prepareSketch(sketchDir: string): void {
  const sdk = getPath2WARDuinoSDK();
  if (sdk === undefined) {
    throw new Error('WARDUINO_SDK path is not configured');
  }
  const templateDir = path.join(sdk, 'platforms', 'Arduino');
  copyRecursive(`${templateDir}/`, sketchDir);
  writeFileSync(path.join(sketchDir, '.config'), '');

  const templatePath = path.join(sketchDir, 'Arduino.ino.template');
  let template = readFileSync(templatePath, 'utf-8');
  const stats = (label: string) =>
    `    printf("${MARKER} ${label} total=%u free=%u maxalloc=%u minfree=%u psram=%u\\n", ` +
    `(unsigned)ESP.getHeapSize(), (unsigned)ESP.getFreeHeap(), (unsigned)ESP.getMaxAllocHeap(), ` +
    `(unsigned)ESP.getMinFreeHeap(), (unsigned)ESP.getPsramSize());\n`;

  const bootAnchor = 'Serial.begin(115200);';
  const loadedAnchor = 'printf("START\\n\\n");';
  if (!template.includes(bootAnchor) || !template.includes(loadedAnchor)) {
    throw new Error(
      `Unexpected Arduino template ${templatePath}: cannot insert heap prints`,
    );
  }
  template = template.replace(bootAnchor, `${bootAnchor}\n${stats('boot')}`);
  template = template.replace(
    loadedAnchor,
    `${loadedAnchor}\n${stats('loaded')}`,
  );
  writeFileSync(templatePath, template);
}

function parseStats(line: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of line.matchAll(/(\w+)=(\d+)/g)) {
    out[m[1]] = Number.parseInt(m[2], 10);
  }
  return out;
}

/*
 * Reset the board through RTS (EN pin) and collect its serial output
 * until the module is loaded, an allocation fails, or `timeoutMs` elapses.
 */
async function readHeapReport(
  port: string,
  pages: number,
  timeoutMs: number,
): Promise<HeapReport> {
  const report: HeapReport = { pages, loaded: false };
  const serial = new SerialPort({ path: port, baudRate: 115200 });
  await new Promise<void>((resolve, reject) =>
    serial.on('open', () => resolve()).on('error', reject),
  );

  // EN low (reset) while IO0 stays high, then release EN to boot normally
  await new Promise((r) => serial.set({ dtr: false, rts: true }, r));
  await new Promise((r) => setTimeout(r, 150));
  await new Promise((r) => serial.set({ dtr: false, rts: false }, r));

  let buffer = '';
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      report.error ??= `timeout after ${timeoutMs} ms`;
      resolve();
    }, timeoutMs);
    serial.on('data', (data: Buffer) => {
      buffer += data.toString('latin1');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.includes(`${MARKER} boot`)) {
          const s = parseStats(line);
          report.bootTotal = s.total;
          report.bootFree = s.free;
          report.bootMaxAlloc = s.maxalloc;
        } else if (line.includes(`${MARKER} loaded`)) {
          const s = parseStats(line);
          report.loaded = true;
          report.total = s.total;
          report.free = s.free;
          report.maxAlloc = s.maxalloc;
          report.minFree = s.minfree;
          report.psram = s.psram;
          report.error = undefined;
          clearTimeout(timer);
          resolve();
        } else if (line.includes(ALLOC_FAILURE)) {
          // drop boot noise preceding the message on the same line
          report.error = line.slice(line.indexOf(ALLOC_FAILURE)).trim();
          clearTimeout(timer);
          resolve();
        }
      }
    });
  });
  await new Promise((r) => serial.close(r));
  return report;
}

async function measure(
  sketchDir: string,
  port: string,
  fqbn: string,
  pages: number,
  timeoutMs: number,
): Promise<HeapReport> {
  const wasmPath = path.join(sketchDir, `heap_${pages}_pages.wasm`);
  writeFileSync(wasmPath, minimalWasmModule(pages));

  // remove stale Arduino.ino and bin/upload.h (also those copied along with
  // the template), so that `make compile` regenerates them from the patched
  // template and the module above
  if ((await ArduinoClean(sketchDir)) !== 0) {
    throw new Error(`Cleaning the sketch ${sketchDir} failed`);
  }
  const compiled = await ArduinoCompile(fqbn, wasmPath, sketchDir, false, true);
  if (compiled !== 0) {
    throw new Error(`Compiling the sketch for ${pages} pages failed`);
  }
  const flashed = await ArduinoFlash(sketchDir, port, fqbn);
  if (flashed !== 0) {
    throw new Error(`Flashing ${port} failed`);
  }
  return await readHeapReport(port, pages, timeoutMs);
}

function kib(bytes?: number): string {
  return bytes === undefined ? '-' : `${(bytes / 1024).toFixed(1)} KiB`;
}

function printSummary(reports: HeapReport[]): void {
  console.log('\npages | loaded | free heap | largest free block | note');
  for (const r of reports) {
    console.log(
      `${String(r.pages).padStart(5)} | ${(r.loaded ? 'yes' : 'no').padEnd(6)} | ` +
        `${kib(r.free).padStart(9)} | ${kib(r.maxAlloc).padStart(18)} | ${r.error ?? ''}`,
    );
  }

  const base = reports[0];
  const maxPages = reports.filter((r) => r.loaded).map((r) => r.pages);
  console.log('');
  if (base.bootTotal !== undefined) {
    console.log(
      `Heap at boot (OS + Arduino firmware + WARDuino statics): total=${kib(base.bootTotal)}, free=${kib(base.bootFree)}, largest block=${kib(base.bootMaxAlloc)}`,
    );
  }
  if (base.loaded) {
    console.log(
      `Heap after loading WARDuino with an empty module (0 pages): free=${kib(base.free)}, largest block=${kib(base.maxAlloc)}, PSRAM=${kib(base.psram)}`,
    );
    console.log(
      `=> theoretical upper bound for linear memory: ${Math.floor((base.maxAlloc ?? 0) / PAGE_SIZE)} page(s) (largest block), ${Math.floor((base.free ?? 0) / PAGE_SIZE)} page(s) (total free heap)`,
    );
  }
  console.log(
    `=> measured: largest number of pages WARDuino could allocate = ${maxPages.length > 0 ? Math.max(...maxPages) : 'none'}`,
  );
}

export function registerMeasureHeapCommand(program: Command): void {
  program
    .command('measure-heap')
    .description(
      'measure the RAM left for Wasm linear memory on an MCU running WARDuino',
    )
    .requiredOption('--port <serial-port>', 'serial port of the MCU')
    .option(
      '--fqbn <fqbn>',
      'fully qualified board name',
      'm5stack:esp32:m5stick-c',
    )
    .option(
      '--max-pages <n>',
      'stop probing after this number of pages',
      parsePositiveInt,
      8,
    )
    .option(
      '--timeout <ms>',
      'how long to wait for the board to report after flashing',
      parsePositiveInt,
      20000,
    )
    .option(
      '--out <dir>',
      'directory for the generated sketch, modules, and results',
      path.join(tmpdir(), 'wasmito-measure-heap'),
    )
    .action(async (options) => {
      const sketchDir = path.join(options.out, 'Arduino');
      createDirectoryIfUnexisting(sketchDir);
      prepareSketch(sketchDir);

      const reports: HeapReport[] = [];
      for (let pages = 0; pages <= options.maxPages; pages++) {
        console.log(`Flashing WARDuino with a module of ${pages} page(s)...`);
        const r = await measure(
          sketchDir,
          options.port,
          options.fqbn,
          pages,
          options.timeout,
        );
        reports.push(r);
        console.log(JSON.stringify(r));
        if (!r.loaded) break;
      }

      const resultsPath = path.join(options.out, 'heap_report.json');
      writeFileSync(resultsPath, JSON.stringify(reports, null, 2));
      printSummary(reports);
      console.log(`\nRaw results written to ${resultsPath}`);
    });
}
