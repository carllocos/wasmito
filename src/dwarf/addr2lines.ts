import { spawn } from 'child_process';

/*
 * This source file runs `wasm-tools addr2line` command and decodes result
 */

export async function addr2line(
  wasmFilePath: string,
  addr: number,
): Promise<undefined | [string, string, number, number, number]> {
  const [exitCode, stdout, stderr] = await runAddr2lineCommand(
    wasmFilePath,
    addr,
  );
  if (exitCode !== 0 || stderr !== '') {
    return undefined;
  }

  return extractLineColInfo(stdout);
}

function extractLineColInfo(
  cmdStdOutput: string,
): undefined | [string, string, number, number, number] {
  // stdout is of the has one of the following forms
  // 1. 0xaddres: name-source-location path/to/sourcefile.rs:linenr:colnr\n
  // 2. 0xaddres: name-source-location path/to/sourcefile.rs:linenr\n
  // 3. OtherAddress0xaddres: name-source-location path/to/sourcefile.rs:linenr\n
  // 3 is related to DWARF information and can be ignored

  const pattern = /^(0x[0-9a-fA-F]+):(.*rs):(\d+):?(\d+)?\n$/;
  const matched = cmdStdOutput.match(pattern);
  if (matched === null || matched === undefined) {
    if (cmdStdOutput.includes('no dwarf frames found')) {
      return undefined;
    }
    throw new Error(`ignored line ${cmdStdOutput}`);
  }

  const addr = Number(matched[1]);
  if (isNaN(addr)) {
    throw new Error(
      `WasmAddr is supposed to be convetable to a number given ${matched[1]}`,
    );
  }

  const nameAndSourceFile = matched[2].split(' ');

  const sourceFile = nameAndSourceFile.pop();
  if (sourceFile === undefined) {
    throw new Error(
      `Encountered a sourcelocation for which no sourceFile can be derived ${matched[2]}`,
    );
  }

  const name = nameAndSourceFile.join(' ').trim();

  const linenr = Number(matched[3]);
  if (isNaN(linenr)) {
    throw new Error(
      `linenr is supposed to be convetable to a number given ${matched[3]}`,
    );
  }

  let colnr = 0;
  if (matched[4] !== undefined) {
    colnr = Number(matched[4]);
    if (isNaN(colnr)) {
      throw new Error(
        `colnr is supposed to be convetable to a number given ${matched[4]}`,
      );
    }
  } else {
    console.debug(
      `originalColnumber is undefined so fallback to colnumber equal to 0`,
    );
  }
  return [sourceFile, name, addr, linenr, colnr];
}

export async function runAddr2lineCommand(
  wasmFilePath: string,
  addr: number,
): Promise<[number, string, string]> {
  return new Promise<[number, string, string]>((resolve, reject) => {
    const hexAddr = `0x${addr.toString(16)}`;
    const command = ['wasm-tools', 'addr2line', wasmFilePath, hexAddr];
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
        throw new Error(`Got a non number exitCode for addr2line`);
      }
      resolve([code, stdout, stderr]);
    });
    process.on('error', (err) => {
      reject(err);
    });
  });
}
