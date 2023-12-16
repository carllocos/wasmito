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

export function getFileExtension(filePath: string): string | undefined {
  const parts: string[] = filePath.split('.');
  if (parts.length === 1 || (parts[0] === '' && parts.length === 2)) {
    return undefined;
  }
  const extension: string = parts[parts.length - 1];
  return extension;
}

export function getFileName(filename: string): string {
  const splits = filename.split('/');
  if (splits.length === 0) {
    return '';
  } else {
    return splits[splits.length - 1];
  }
}

export function removeFileExtension(filename: string): string {
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1) {
    return filename;
  } else {
    return filename.substring(0, dotIdx);
  }
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
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err !== undefined && err != null) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export function createDirectoryIfUnexisting(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

export function getAbsolutePath(inputPath: string): string {
  const isAbsolutePath = path.isAbsolute(inputPath);
  if (isAbsolutePath) {
    return inputPath;
  }
  return path.resolve(inputPath);
}
export async function renameFile(
  filePath: string,
  newName: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const directory = path.dirname(filePath);
    const newFilePath = path.join(directory, newName);

    fs.rename(filePath, newFilePath, (err) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve(newFilePath);
      }
    });
  });
}
