import { spawn } from 'child_process';

/*
 * This file defines functions read metada of a wasm file through
 * command `wasm-tools metadata show`
 */

export async function getProducer(wasmFilePath: string): Promise<string> {
  const languageUsed = await readLanguageMetadata(wasmFilePath);
  return languageUsed ?? '';
}

export async function readLanguageMetadata(
  wasmFilePath: string,
): Promise<string | undefined> {
  return readMetadataWasm(wasmFilePath, 'language');
}

async function readMetadataWasm(
  wasmFilePath: string,
  metaDataOfInterest: string,
): Promise<string | undefined> {
  /*  This command produces a string of the following form.
   * metaDataOfInterest should be either 'language' or 'processed-by'
   * example command output:
   * 'module:
   *   language:
   *       Rust
   *   processed-by:
   *       rustc: 1.76.0 (07dca489a 2024-02-04)'
   */

  const metadataKey = metaDataOfInterest.endsWith(':')
    ? metaDataOfInterest
    : `${metaDataOfInterest}:`;

  const [exitCode, stdout, stderr] = await runShowMetadataCommand(wasmFilePath);
  if (exitCode !== 0 || stderr !== '') {
    console.error(
      `wasm-tools metadata show failed with code ${exitCode} error ${stderr}`,
    );
    return undefined;
  }
  const metadata = stdout.split('\n').map((s) => s.trim());
  const idx = metadata.map((s) => s.toLowerCase()).indexOf(metadataKey);

  if (idx === -1 || idx + 1 >= metadata.length) {
    throw new Error(`no metadata item found on wasm for ${metaDataOfInterest}`);
  }
  return metadata[idx + 1];
}

async function runShowMetadataCommand(
  wasmFilePath: string,
): Promise<[number, string, string]> {
  return new Promise<[number, string, string]>((resolve, reject) => {
    const command = ['wasm-tools', 'metadata', 'show', wasmFilePath];

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
