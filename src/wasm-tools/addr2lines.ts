import { exec } from 'child_process';
import { createLogger } from '../logger/logger';

/*
 * This source file runs `wasm-tools addr2line` command and decodes result
 */

/*
 * TODO
 * From the documentation of `wasm-tools addr2line` we have the following sentence that needs to be accounted for:
 * "Each address may have multiple lines printed for it indicating that the address is an inlined function into another function.
 *  Frames are printed innermost or youngest first."
 */

const logger = createLogger('Addr2Line');

export interface Addr2LineOutput {
  sourceFile: string;
  name: string;
  linenr: number;
  colnr: number;
  address: number;
}

export async function addr2line(
  wasmFilePath: string,
  addr: number,
  nrAttempts: number = 5,
): Promise<Addr2LineOutput[]> {
  const [exitCode, stdout, stderr] = await runAddr2lineCommand(
    wasmFilePath,
    addr,
    nrAttempts,
  );
  if (exitCode !== 0 || stderr !== '') {
    return [];
  }
  return extractLineColInfo(stdout);
}

function extractLineColInfo(cmdStdOutput: string): Addr2LineOutput[] {
  // stdout has one of the following forms
  // form 1. 0xaddres: name-source-location path/to/sourcefile.rs:linenr:colnr\n
  // form 2. 0xaddres: name-source-location path/to/sourcefile.rs:linenr\n
  // form 3. OtherAddress0xaddres: name-source-location path/to/sourcefile.rs:linenr\n
  // form 3 is related to DWARF information and can be ignored
  // form 4. as 2 or 1 where the part after the hexa address is repeated
  // form 5. 0xaddr: no dwarf frames found for 0xaddr
  // form 6. 0xaddr: name-source-location\n

  const matchAddress = cmdStdOutput.match(/^(0x[0-9a-fA-F]+):(.*)/);
  if (matchAddress === null || matchAddress === undefined) {
    throw new Error(`No prefix wasmAddress found in line ${cmdStdOutput}`);
  }

  const address = Number(matchAddress[1]);
  if (isNaN(address)) {
    throw new Error(
      `WasmAddr is supposed to be convetable to a number given ${matchAddress[1]}`,
    );
  }

  const restStr = cmdStdOutput.slice(matchAddress[1].length + 1);

  // if contents contains more than 1 item then we have form 4
  const contents = restStr
    .split('\n')
    .map((c) => c.trim())
    .filter((c) => c !== '');
  const outputs: Addr2LineOutput[] = [];

  for (const c of contents) {
    let linenrStr = '';
    let colnrStr = '';
    let matched = c.match(/(.*):(\d+):(\d+)$/);
    if (matched !== null) {
      // case of form1
      colnrStr = matched[3];
    } else {
      // case of form2
      matched = c.match(/(.*):(\d+)$/);
      if (matched === null) {
        // case of form5 or form6
        continue;
      }
    }

    linenrStr = matched[2];

    const linenr = Number(linenrStr);
    if (isNaN(linenr)) {
      throw new Error(
        `linenr is supposed to be convetable to a number given ${linenrStr}`,
      );
    }

    let colnr = 1;
    if (colnrStr !== '') {
      colnr = Number(colnrStr);
      if (isNaN(colnr)) {
        throw new Error(
          `colnr is supposed to be convetable to a number given ${colnrStr}`,
        );
      }
    }

    const nameAndSourceFile = matched[1];
    const matchedNameAndSrcFile = nameAndSourceFile.match(/(.*) (\/.*)$/);
    if (matchedNameAndSrcFile === null) {
      throw new Error(`no name nor sourcefile found for content '${c}'`);
    }
    const name = matchedNameAndSrcFile[1].trim();
    const sourceFile = matchedNameAndSrcFile[2].trim();

    outputs.push({ sourceFile, name, address, linenr, colnr });
  }
  return outputs;
}

// export async function runAddr2lineCommand(
//   wasmFilePath: string,
//   addr: number,
// ): Promise<[number, string, string]> {
//   return new Promise<[number, string, string]>((resolve, reject) => {
//     const hexAddr = `0x${addr.toString(16)}`;
//     const command = ['wasm-tools', 'addr2line', wasmFilePath, hexAddr];
//     const process = spawn(command[0], command.slice(1), { stdio: 'pipe' });
//     let stdout = '';
//     let stderr = '';

//     process.stdout.on('data', (data) => {
//       stdout += data.toString();
//     });

//     process.stderr.on('data', (data) => {
//       stderr += data.toString();
//     });

//     process.on('close', (code) => {
//       if (typeof code !== 'number') {
//         throw new Error(`Got a non number exitCode for addr2line`);
//       }
//       resolve([code, stdout, stderr]);
//     });
//     process.on('error', (err) => {
//       reject(err);
//     });
//   });

export async function runAddr2lineCommand(
  wasmFilePath: string,
  addr: number,
  maxAttempts: number = 5,
): Promise<[number, string, string]> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts += 1;
    const [exitCode, stdout, stderr, retry] = await runAddr2lineCommandHelper(
      wasmFilePath,
      addr,
    );
    if (!retry) {
      return [exitCode, stdout, stderr];
    }
    logger.debug(`#${attempts} for addr ${addr}`);
  }
  throw new Error(`Ran out of attempts for addr ${addr}`);
}

export async function runAddr2lineCommandHelper(
  wasmFilePath: string,
  addr: number,
): Promise<[number, string, string, boolean]> {
  return new Promise<[number, string, string, boolean]>((resolve, reject) => {
    const command = `wasm-tools addr2line ${wasmFilePath} ${addr}`;
    try {
      const p = exec(command, (error, stdout, stderr) => {
        if (typeof p.exitCode !== 'number') {
          reject(new Error(`Got a non number exitCode for addr2line`));
        } else if (error !== null) {
          resolve([p.exitCode, stdout, error.message, false]);
        } else {
          resolve([p.exitCode, stdout, stderr, false]);
        }
      });
    } catch (err) {
      if (err instanceof Error) {
        const errcode = (err as NodeJS.ErrnoException).code;
        if (errcode === 'ENOTCONN' || errcode === 'EBADF') {
          resolve([-1, '', '', true]);
        } else {
          logger.error(
            `Different error occurred during addr2line command: ${err.message}`,
          );
          throw err;
        }
      } else {
        logger.error(
          `Different error occurred during addr2line command: ${err}`,
        );
        throw err;
      }
    }
  });
}
