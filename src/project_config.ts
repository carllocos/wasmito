import * as fs from 'fs';
import * as path from 'path';
import { isDirectoryPath } from './util/file_util';

export class ProjectConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectConfigError';
    Error.captureStackTrace(this, ProjectConfigError);
  }
}

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
  NODE_MODULES?: string;
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

export function getPath2WARDuinoSDKVMBinary(): string {
  if (sdkPaths.WARDUINO_SDK === undefined) {
    const path = getPath2WARDuinoSDK();
    if (path !== undefined) {
      return `${path}/build-emu/wdcli`;
    } else {
      throw new ProjectConfigError(
        "Path to WARDuino SDK is not set. You can set it via env variable 'WARDUINO_SDK=PATH', call to setPath2WABT, or .wasmito/adk_config.cfg file.",
      );
    }
  }
  return `${sdkPaths.WARDUINO_SDK}/build-emu/wdcli`;
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
      if (fp.NODE_MODULES !== undefined) {
        sdkPaths.NODE_MODULES = fp.NODE_MODULES;
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
      } else if (key === 'NODE_MODULES') {
        if (path !== '') {
          config.NODE_MODULES = path;
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

export function getPath2WABT(): string {
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
  const path = getPath2WABT();
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

export function getPath2AssemblyScriptCompiler(): string {
  return 'asc';
}

export function getPath2NPX(): string {
  return 'npx';
}

export function getPath2AssemblyScriptLib(): string {
  if (sdkPaths.NODE_MODULES === undefined) {
    loadSDKConfig();
  }
  if (sdkPaths.NODE_MODULES === undefined) {
    throw new ProjectConfigError(
      "Path to wasmito used node modules NODE_MODULES is not set. You can set it via env variable 'call to setPath2NODEMODULES, or .wasmito/adk_config.cfg file.",
    );
  }

  const p = path.join(sdkPaths.NODE_MODULES, 'assemblyscript/');
  if (!isDirectoryPath(p)) {
    throw new ProjectConfigError(`Path to AssemblyScript does not exist ${p}`);
  }
  return p;
}

export function setPath2NodeModules(path: string): void {
  sdkPaths.NODE_MODULES = path;
}
