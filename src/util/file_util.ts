import os from 'os';
import * as path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { getGlobalLogger } from '../logger/logger';

export function replaceFileExtension(
  filePath: string,
  newExtension: string,
): string {
  const fileExt = path.extname(filePath);
  const fileNameWithoutExt = path.basename(filePath, fileExt);
  const filePathWithoutFile = path.dirname(filePath);
  return path.join(filePathWithoutFile, `${fileNameWithoutExt}${newExtension}`);
}

export function createTempDirectory(prefix: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return tempDir;
}

export async function copyRecursive(
  source: string,
  destination: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const command = `mkdir -p ${destination} && cp -r ${source} ${destination}`;

    exec(command, (error, stdout, stderr) => {
      if (error !== null) {
        getGlobalLogger().error(
          `CopyRecursive: Error copying template files from ${source} to ${destination}. Error message: ${error.message}`,
        );
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err !== undefined && err != null) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
