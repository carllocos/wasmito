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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return 'Invalid project nr';
  }
}

export function readProjectDescription(): string {
  try {
    readPackageJSON();
    return packageConfig.description;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return 'Invalid project description';
  }
}

export function readProjectName(): string {
  try {
    readPackageJSON();
    return packageConfig.name;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return 'Error in Name';
  }
}

interface SDKPaths {
  WARDUINO_SDK?: string;
  WABT?: string;
  NODE_MODULES?: string;
  ARDUINO_CLI?: string;
  ARDUINO_CONFIG?: string;
  ARDUINO_LIBS?: string;
  WASM_TOOLS?: string;
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

export function getPath2WasmitoSDKVMBinary(): string {
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
      if (fp.ARDUINO_CLI !== undefined) {
        sdkPaths.ARDUINO_CLI = fp.ARDUINO_CLI;
      }
      if (fp.ARDUINO_CONFIG !== undefined) {
        sdkPaths.ARDUINO_CONFIG = fp.ARDUINO_CONFIG;
      }
      if (fp.ARDUINO_LIBS !== undefined) {
        sdkPaths.ARDUINO_LIBS = fp.ARDUINO_LIBS;
      }
      if (fp.WASM_TOOLS !== undefined) {
        sdkPaths.WASM_TOOLS = fp.WASM_TOOLS;
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
      const [key, val] = content;
      if (val === '') return;

      switch (key) {
        case 'WARDUINO_SDK':
          config.WARDUINO_SDK = val;
          break;
        case 'WABT':
          config.WABT = val;
          break;
        case 'NODE_MODULES':
          config.NODE_MODULES = val;
          break;
        case 'ARDUINO_CLI':
          config.ARDUINO_CLI = val;
          break;
        case 'ARDUINO_CONFIG':
          config.ARDUINO_CONFIG = val;
          break;
        case 'ARDUINO_LIBS':
          config.ARDUINO_LIBS = val;
          break;
        case 'WASM_TOOLS':
          config.WASM_TOOLS = val;
          break;
        default:
          return;
      }
    });

    return config;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  return `${sdkPaths.WABT}/build`;
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

export function getPathArduinoCLI(): string {
  if (sdkPaths.ARDUINO_CLI === undefined) {
    sdkPaths.ARDUINO_CLI = process.env.ARDUINO_CLI;
    if (sdkPaths.ARDUINO_CLI !== undefined) {
      sdkPaths.ARDUINO_CLI = `${sdkPaths.ARDUINO_CLI}`;
    } else {
      loadSDKConfig();
    }
  }

  if (sdkPaths.ARDUINO_CLI === undefined) {
    throw new ProjectConfigError(
      `ARDUINO_CLI path has not been set. Set it either via env variable ARDUINO_CLI, or .wasmito/sdk_config.cfg file.`,
    );
  }

  return `${sdkPaths.ARDUINO_CLI}`;
}

export function getPathArduinoConfig(): string | undefined {
  if (sdkPaths.ARDUINO_CONFIG === undefined) {
    sdkPaths.ARDUINO_CONFIG = process.env.ARDUINO_CONFIG;
    if (sdkPaths.ARDUINO_CONFIG !== undefined) {
      sdkPaths.ARDUINO_CONFIG = `${sdkPaths.ARDUINO_CONFIG}`;
    } else {
      loadSDKConfig();
    }
  }

  return sdkPaths.ARDUINO_CONFIG;
}

export function getPathArduinoLibsPath(): string {
  if (sdkPaths.ARDUINO_LIBS === undefined) {
    sdkPaths.ARDUINO_LIBS = process.env.ARDUINO_LIBS;
    if (sdkPaths.ARDUINO_LIBS !== undefined) {
      sdkPaths.ARDUINO_LIBS = `${sdkPaths.ARDUINO_LIBS}`;
    } else {
      loadSDKConfig();
    }
  }

  if (sdkPaths.ARDUINO_LIBS === undefined) {
    throw new ProjectConfigError(
      `ARDUINO_LIBS path has not been set. Set it either via env variable ARDUINO_LIBS, or .wasmito/sdk_config.cfg file.`,
    );
  }

  return `${sdkPaths.ARDUINO_LIBS}`;
}

export function getPathWasmTools(): string {
  if (sdkPaths.WASM_TOOLS === undefined) {
    sdkPaths.WASM_TOOLS = process.env.WASM_TOOLS;
    if (sdkPaths.WASM_TOOLS !== undefined) {
      sdkPaths.WASM_TOOLS = `${sdkPaths.WASM_TOOLS}`;
    } else {
      loadSDKConfig();
    }
  }

  if (sdkPaths.WASM_TOOLS === undefined) {
    throw new ProjectConfigError(
      `WASM_TOOLS path has not been set. Set it either via env variable WASM_TOOLS, or .wasmito/sdk_config.cfg file.`,
    );
  }

  return `${sdkPaths.WASM_TOOLS}`;
}
