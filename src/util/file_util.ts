import os from 'os';
import * as path from 'path';
import fs, { readFileSync } from 'fs';
import { getGlobalLogger } from '../logger/logger';
import { createHash } from 'crypto';

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

export function getFileName(
  filename: string,
  includeExtension: boolean = true,
): string {
  const splits = filename.split('/');
  if (splits.length === 0) {
    return '';
  } else {
    const fn = splits[splits.length - 1];
    if (includeExtension) {
      return fn;
    } else {
      return fn.split('.')[0];
    }
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

export function copyRecursive(source: string, target: string): void {
  getGlobalLogger().debug(`Copying ${source} to ${target}`);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
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
  const exists = fs.existsSync(directoryPath);
  if (!exists) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

export function isAbsolutePath(inputPath: string): boolean {
  return path.isAbsolute(inputPath);
}

export function getAbsolutePath(inputPath: string): string {
  if (isAbsolutePath(inputPath)) {
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

export function isFilePath(path: string): boolean {
  try {
    const stats = fs.statSync(path);
    return stats.isFile();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }
}

export function isDirectoryPath(path: string): boolean {
  try {
    const stats = fs.statSync(path);
    return stats.isDirectory();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }
}

export async function readFileAsJSON(filePath: string): Promise<any> {
  const content: Buffer = await fs.promises.readFile(filePath);
  return JSON.parse(content.toString());
}

export function pathJoin(dirPath: string, otherPath: string): string {
  return path.join(dirPath, otherPath);
}

export function getDirectory(filePath: string): string {
  return path.dirname(filePath);
}

export function removeFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function pathsEqual(p1: string, p2: string): boolean {
  const rp1 = path.resolve(p1);
  const rp2 = path.resolve(p2);
  return rp1 === rp2;
}

export async function listFilesInDirectory(
  directoryPath: string,
): Promise<string[]> {
  return await fs.promises.readdir(directoryPath);
}

export function sha256ForFile(filePath: string): string {
  const fileBuffer = readFileSync(filePath);
  return createHash('sha256').update(fileBuffer).digest('hex');
}

export function copyFile(file1: string, file2: string): void {
  fs.copyFileSync(file1, file2);
}

export function sanitizeFilename(filename: string): string {
  // eslint-disable-next-line no-useless-escape
  return filename.replace(/[\/\\:*?"<>|]/g, '_');
}
