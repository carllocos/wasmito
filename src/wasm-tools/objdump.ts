import { spawn } from 'child_process';

export interface ObjDumpLine {
  sectionName: string;
  startWasmAddress: number;
  endWasmAddress: number;
  nrBytes: number;
  count: number;
}

export async function wasmToolsObjdump(
  wasmFilePath: string,
): Promise<ObjDumpLine[] | undefined> {
  const [exitCode, stdOutoput, stderr] = await runObjdumpCommand(wasmFilePath);
  if (exitCode !== 0 || stderr !== '') {
    return undefined;
  }

  const dumpLines: ObjDumpLine[] = [];
  const lines = stdOutoput.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== '') {
      dumpLines.push(extractObjdump(lines[i]));
    }
  }
  return dumpLines;
}

function extractObjdump(cmdStdOutput: string): ObjDumpLine {
  // string is of the form `section name | 0xaddr1 - 0xaddr2 | nr bytes | nr count
  // e.g.,
  //   types                                  |        0xa -       0x1d |        19 bytes | 4 count

  const [sectionName, addressRange, nrBytesStr, nrCountStr] = cmdStdOutput
    .split('|')
    .map((c) => c.trim());
  const matched = addressRange.match(/^(0x[0-9a-fA-F]+).*-.*(0x[0-9a-fA-F]+)$/);
  if (matched === null || matched === undefined) {
    throw new Error(
      `No hexa address range found for section line ${cmdStdOutput}`,
    );
  }

  const startWasmAddress = Number(matched[1]);
  if (isNaN(startWasmAddress)) {
    throw new Error(
      `startWasmAddr is supposed to be convetable to a number given ${matched[1]}`,
    );
  }

  const endWasmAddress = Number(matched[2]);
  if (isNaN(endWasmAddress)) {
    throw new Error(
      `endWasmAddr is supposed to be convetable to a number given ${matched[2]}`,
    );
  }

  const matchedNrbytes = nrBytesStr.match(/^(\d+) bytes$/);
  if (matchedNrbytes === null || matchedNrbytes === undefined) {
    throw new Error(`No nr bytes found for section line ${cmdStdOutput}`);
  }
  const nrBytes = Number(matchedNrbytes[1]);
  if (isNaN(nrBytes)) {
    throw new Error(
      `nrBytes is supposed to be convetable to a number given ${matchedNrbytes[1]}`,
    );
  }

  const countMatch = nrCountStr.match(/^(\d+) count$/);
  if (countMatch === null || countMatch === undefined) {
    throw new Error(`No nr of count found for section line ${cmdStdOutput}`);
  }

  const count = Number(countMatch[1]);
  if (isNaN(count)) {
    throw new Error(
      `count is supposed to be convetable to a number given ${countMatch[1]}`,
    );
  }
  return {
    sectionName,
    startWasmAddress,
    endWasmAddress,
    nrBytes,
    count,
  };
}

export async function runObjdumpCommand(
  wasmFilePath: string,
): Promise<[number, string, string]> {
  return new Promise<[number, string, string]>((resolve, reject) => {
    const command = ['wasm-tools', 'objdump', wasmFilePath];
    const process = spawn(command[0], command.slice(1), { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (typeof code !== 'number') {
        throw new Error(
          `Got a non number exitCode for 'wasm-tools objdump ${wasmFilePath}'`,
        );
      }
      resolve([code, stdout, stderr]);
    });
    process.on('error', (err) => {
      reject(err);
    });
  });
}
