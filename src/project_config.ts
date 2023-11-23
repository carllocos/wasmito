import * as fs from 'fs';
import * as path from 'path';
import { getGlobalLogger } from './logger/logger';

let packageConfig: any;

function readPackageJSON(): void {
  if (packageConfig === undefined) {
    const packageJson = fs.readFileSync('package.json', 'utf8');
    packageConfig = JSON.parse(packageJson);
  }
}

export function readProjectVersionNumber(): string {
  try {
    readPackageJSON();
    return packageConfig.version;
  } catch (error) {
    return 'Invalid project nr';
  }
}

export function readProjectDescription(): string {
  try {
    readPackageJSON();
    return packageConfig.description;
  } catch (error) {
    return 'Invalid project description';
  }
}

export function readProjectName(): string {
  try {
    readPackageJSON();
    return packageConfig.name;
  } catch (error) {
    return 'Error in Name';
  }
}

interface SDKPaths {
  WARDUINO_SDK?: string;
  WABT?: string;
}

const sdkPaths: SDKPaths = {};

export function getPath2WARDuinoSDK(): string | undefined {
  if (sdkPaths.WARDUINO_SDK === undefined) {
    const path = process.env.WARDUINO_SDK;
    if (path === undefined) {
      loadSDKConfig();
    } else {
      sdkPaths.WARDUINO_SDK = path;
    }
  }
  return sdkPaths.WARDUINO_SDK;
}

export function setPath2WARDuinoSDK(path: string): void {
  sdkPaths.WARDUINO_SDK = path;
}

export function getPath2WARDuinoSDKEmulatorBinary(): string | undefined {
  if (sdkPaths.WARDUINO_SDK === undefined) {
    const path = getPath2WARDuinoSDK();
    if (path !== undefined) {
      sdkPaths.WARDUINO_SDK = `${path}/build-emu/wdcli`;
    }
  }
  return sdkPaths.WARDUINO_SDK;
}

function loadSDKConfig(): void {
  const file = './.wasmito/sdk_config.cfg';
  const currentFilePath = __filename;
  const currentDir = path.dirname(currentFilePath);
  const cfgFile = findFileInParentDirectory(file, currentDir);
  if (cfgFile !== undefined) {
    const fp = readSDKPaths(cfgFile);
    if (fp !== undefined) {
      if (fp.WARDUINO_SDK !== undefined) {
        sdkPaths.WARDUINO_SDK = fp.WARDUINO_SDK;
      }
      if (fp.WABT !== undefined) {
        sdkPaths.WABT = fp.WABT;
      }
    }
  }
}

function readSDKPaths(filePath: string): SDKPaths | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const config: SDKPaths = {};

    lines.forEach((line) => {
      const content = line.split('=');
      if (content.length !== 2) {
        return;
      }
      const [key, path] = content;
      if (key === 'WARDUINO_SDK') {
        if (path !== '') {
          config.WARDUINO_SDK = path;
        }
      } else if (key === 'WABT') {
        if (path !== '') {
          config.WABT = path;
        }
      }
    });

    return config;
  } catch (error) {
    return undefined;
  }
}

function findFileInParentDirectory(
  fileName: string,
  currentPath: string,
): string | undefined {
  const parentPath = path.resolve(currentPath, '..');

  if (fs.existsSync(parentPath)) {
    const filePath = path.join(parentPath, fileName);

    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
      return filePath;
    }

    // Stop if Git repo is encountered
    if (fs.existsSync(path.join(parentPath, '.git'))) {
      return undefined;
    }

    return findFileInParentDirectory(fileName, parentPath);
  }

  return undefined;
}

export function getPath2WABT(): string | undefined {
  if (sdkPaths.WABT === undefined) {
    sdkPaths.WABT = process.env.WABT;
    if (sdkPaths.WABT !== undefined) {
      sdkPaths.WABT = `${sdkPaths.WABT}/bin`;
    } else {
      loadSDKConfig();
    }
  }

  if (sdkPaths.WABT === undefined) {
    throw new ProjectConfigError(
      `WABT path has not been set. Set it either via env variable WABT, call to setPath2WABT, or .wasmito/adk_config.cfg file.`,
    );
  }

  return `${sdkPaths.WABT}/bin`;
}

export function getPath2WAT2WASM(): string {
  let path = sdkPaths.WABT;
  if (path === undefined) {
    path = getPath2WABT();
  }
  return `${path}/wat2wasm`;
}

export function setPath2WABT(path: string): void {
  sdkPaths.WABT = path;
}

export function getPath2ObjDump(): string {
  const path = getPath2WABT();
  return `${path}/wasm-objdump`;
}

export function getPath2XXD(): string {
  return 'xxd';
}
