import { type MappingItem } from 'source-map';

import { spawn } from 'child_process';
import { readLanguageMetadata } from './metadata_wasm';

/*
 * This source file will construct a sourcemap for a given file using the wasm-tools addr2line command
 */
export interface SourceMap {
  factory: string;
  mappings: MappingItem[];
}

export async function buildSourceMap(wasmFilePath: string): Promise<SourceMap> {
  const producer = await getProducer(wasmFilePath);
  const wasmAddresses = getAddressRangeOffset(wasmFilePath);
  const mappingsResults = await Promise.all(
    wasmAddresses.map(async (addr: number) => {
      return createMappingForAddr(wasmFilePath, addr);
    }),
  );

  const mappings: MappingItem[] = [];
  for (const m of mappingsResults) {
    if (m !== undefined) {
      mappings.push(m);
    }
  }

  return {
    factory: producer,
    mappings,
  };
}

function getAddressRangeOffset(wasmFilePath: string): number[] {
  // TODO fix ranges
  const endAddr = 406;
  const wasmAddresses: number[] = [];
  for (let addr = 0; addr < endAddr; addr++) {
    wasmAddresses.push(addr);
  }
  return wasmAddresses;
}

async function getProducer(wasmFilePath: string): Promise<string> {
  const languageUsed = await readLanguageMetadata(wasmFilePath);
  return languageUsed ?? '';
}

export async function createMappingForAddr(
  wasmFilePath: string,
  addr: number,
): Promise<MappingItem | undefined> {
  const [exitCode, stdout, stderr] = await addr2line(wasmFilePath, addr);
  if (exitCode !== 0 || stderr !== '') {
    return undefined;
  }

  const info = extractLineColInfo(stdout);
  if (info === undefined) {
    return undefined;
  }

  const [source, name, generatedColumn, originalLine, originalColumn] = info;
  const generatedLine = 0;
  return {
    source,
    generatedLine,
    generatedColumn,
    originalColumn,
    originalLine,
    name,
  };
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

export async function addr2line(
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
