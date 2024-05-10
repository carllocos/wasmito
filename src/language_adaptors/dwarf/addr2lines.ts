import { type MappingItem } from 'source-map';

import { spawn } from 'child_process';

/*
 * This source file will construct a sourcemap for a given file using the wasm-tools addr2line command
 */
export interface SourceMap {
  factory: string;
  mappings: MappingItem[];
}

export async function buildSourceMap(wasmFilePath: string): Promise<SourceMap> {
  const wasmAddresses = getAddressRangeOffset(wasmFilePath);

  const producer = getProducer(wasmFilePath);

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
  const endAddr = 255;
  const wasmAddresses: number[] = [];
  for (let addr = 0; addr < endAddr; addr++) {
    wasmAddresses.push(addr);
  }
  return wasmAddresses;
}

function getProducer(wasmFilePath: string): string {
  return 'todo';
}

export async function createMappingForAddr(
  wasmFilePath: string,
  addr: number,
): Promise<MappingItem | undefined> {
  const [exitCode, stdout, stderr] = await addr2line(wasmFilePath, addr);
  if (exitCode !== 0 || stderr !== '') {
    return undefined;
  }
  console.log(`stdout: ${stdout}`);

  return undefined;
}

export async function addr2line(
  wasmFilePath: string,
  addr: number,
): Promise<[number, string, string]> {
  return new Promise<[number, string, string]>((resolve, reject) => {
    const hexAddr = addr.toString(16);
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
