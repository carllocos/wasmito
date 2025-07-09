import { exec } from 'child_process';
import { createLogger } from '../logger/logger';
import { getPathWasmTools } from '../project_config';

const logger = createLogger('wasmStrip');

export async function wasmStripCustomSection(
  wasmFilePath: string,
  outputFile: string,
): Promise<[number, string, string]> {
  return new Promise((resolve, reject) => {
    try {
      const command = [
        getPathWasmTools(),
        'strip',
        wasmFilePath,
        '-o',
        outputFile,
      ].join(' ');
      const p = exec(command, (error, stdout, stderr) => {
        if (typeof p.exitCode !== 'number') {
          reject(new Error(`Got a non number exitCode for wasm-tools strip`));
        } else if (error !== null) {
          resolve([p.exitCode, stdout, error.message]);
        } else {
          resolve([p.exitCode, stdout, stderr]);
        }
      });
    } catch (err) {
      if (err instanceof Error) {
        logger.error(
          `Different error occurred during wasm-tools strip command: ${err.message}`,
        );
        resolve([-1, '', err.message]);
      } else {
        resolve([-1, '', '']);
      }
    }
  });
}
