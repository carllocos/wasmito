import { exec, spawn } from 'child_process';
import { createLogger } from '../logger/logger';
import { type PlatformConfig, type BoardFQBN } from './platform_config';
import { Platform } from './platform';
import {
  copyRecursive,
  createDirectoryIfUnexisting,
  getAbsolutePath,
  getFileName,
  isFilePath,
  readFileAsJSON,
  renameFile,
} from '../util/file_util';
import { makeSourceCodeCompiler } from '../compilers/compiler_factory';
import path from 'path';
import { type ProgLangSelectionArgs } from '../compilers/prog_language_selection';
import { maybeTimeoutPromise } from '../util/promise_util';
import { type BoardBaudRate, isSerialPort } from '../util/serial_port';
import { writeFileSync } from 'fs';

const arduinoLogger = createLogger('Arduino');

export class ArduinoBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArduinoBuilderError';
    Error.captureStackTrace(this, ArduinoBuilderError);
  }
}

async function runArduinoCommand(command: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    arduinoLogger.info(`Running command: ${command}`);
    exec(`${command}`, (error, stdout, stderr) => {
      if (error !== null) {
        reject(error);
      }
      resolve(stdout.trim());
    });
  });
}

export async function ArduinoListBoards(): Promise<string[]> {
  const cmdOutput = await runArduinoCommand('arduino-cli board list');
  const lines = cmdOutput.split('\n');
  if (lines.length === 1) {
    return [];
  }
  return lines
    .splice(1, lines.length)
    .map((line) => {
      const vals = line.split(' ');
      return vals[0];
    })
    .filter(isSerialPort);
}

export async function ArduinoListBoardsFQBNs(): Promise<BoardFQBN[]> {
  const cmdOutput = await runArduinoCommand('arduino-cli board listall');
  const lines = cmdOutput.split('\n');
  if (lines.length === 1) {
    return [];
  }
  const fqbns: BoardFQBN[] = [];
  lines.splice(1, lines.length).forEach((line) => {
    const vals = line.split(' ').filter((v) => {
      return v !== '';
    });
    if (vals.length > 1) {
      const boardName = vals.splice(0, vals.length - 1).join(' ');
      const boardFQBN: BoardFQBN = {
        boardName,
        fqbn: vals[vals.length - 1],
      };
      fqbns.push(boardFQBN);
    }
  });
  return fqbns;
}

interface CompiledCacheConfig {
  deviceId: string;
  fqbn: string;
  pauseOnStart: boolean;
  inoSha256: string;
  wasmSha256: string;
  uploadHeaderSha256: string;
  baudrate: BoardBaudRate;
}

export async function ArduinoCompile(
  fqbn: string,
  wasmBinaryPath: string,
  outputDir: string,
  paused: boolean,
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const makeArgs = ['compile', `FQBN=${fqbn}`, `BINARY=${wasmBinaryPath}`];
    if (paused) {
      makeArgs.push('PAUSED=true');
    }
    const compile = spawn('make', makeArgs, {
      cwd: outputDir,
    });

    compile.stdout.on('data', (data) => {
      arduinoLogger.debug(data.toString());
    });

    compile.stderr.on('data', (data: string) => {
      const errMsg = data.toString();
      arduinoLogger.error(errMsg);
    });

    compile.on('close', (code) => {
      if (code !== null) {
        const msg = `Arduino compilation exited with code ${code}`;
        if (code === 0) {
          arduinoLogger.info(msg);
        } else {
          arduinoLogger.error(msg);
        }
        resolve(code);
      } else {
        reject(
          new Error(`Arduino compilation exit code is not a number: ${code}`),
        );
      }
    });
  });
}

async function ArduinoFlash(
  pathToArduinoSketch: string,
  port: string,
  fqbn: string,
  wasmPath: string,
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const flash = spawn(
      'make',
      ['flash', `PORT=${port}`, `FQBN=${fqbn}`, `BINARY=${wasmPath}`],
      {
        cwd: pathToArduinoSketch,
      },
    );
    flash.stdout.on('data', (data) => {
      arduinoLogger.debug(data.toString());
    });

    flash.stderr.on('data', (data: string) => {
      const errMsg = data.toString();
      arduinoLogger.error(errMsg);
    });

    flash.on('close', (code) => {
      if (code !== null) {
        const msg = `Arduino flashing exited with code ${code}`;
        if (code === 0) {
          arduinoLogger.info(msg);
        } else {
          arduinoLogger.error(msg);
        }
        resolve(code);
      } else {
        reject(
          new Error(`Arduino flashing exit code is not a number: ${code}`),
        );
      }
    });
  });
}

export async function ArduinoClean(outputDir: string): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const clean = spawn('make', ['clean'], {
      cwd: outputDir,
    });

    clean.stdout.on('data', (data) => {
      arduinoLogger.debug(data.toString());
    });

    clean.stderr.on('data', (data: string) => {
      const errMsg = data.toString();
      arduinoLogger.error(errMsg);
    });

    clean.on('close', (code) => {
      if (code !== null) {
        const msg = `Arduino clean exited with code ${code}`;
        if (code === 0) {
          arduinoLogger.info(msg);
        } else {
          arduinoLogger.error(msg);
        }
        resolve(code);
      } else {
        reject(new Error(`Arduino clean exit code is not a number: ${code}`));
      }
    });
  });
}

export class ArduinoBoardBuilder extends Platform {
  private readonly pathToArduinoTemplateDir: string;
  private readonly pathToArduinoSketchDir: string;
  private readonly pathToArduinoWasmBinaryDir: string;

  // file not really used however required for the makefil to not crash
  private readonly legacyConfigFile: string;

  public cachePlatformBuild: boolean;

  private readonly lastCompiledCacheConfigPath: string;

  constructor(config: PlatformConfig, outputDir: string = '') {
    super(config, outputDir);
    this.pathToArduinoTemplateDir = getAbsolutePath(
      path.join(this.sdkPath, 'platforms/Arduino'),
    );
    this.pathToArduinoSketchDir = getAbsolutePath(
      path.join(this.outputDirectory, '/Arduino'),
    );
    this.pathToArduinoWasmBinaryDir = getAbsolutePath(
      path.join(this.pathToArduinoSketchDir, '/bin'),
    );

    this.legacyConfigFile = path.join(this.pathToArduinoSketchDir, '.config');
    this.cachePlatformBuild = true;
    this.lastCompiledCacheConfigPath = path.join(
      this.pathToArduinoSketchDir,
      'upload_config.json',
    );
  }

  async createCompiler(selectedLanguage: ProgLangSelectionArgs): Promise<void> {
    // copy Arduino template
    this.logger.info(
      `Copying Arduino template for ${this.config.deviceIdentity.name} (board=${this.config.vmConfig.fqbn.boardName}, ID=${this.config.deviceIdentity.id}) from ${this.pathToArduinoTemplateDir} to ${this.pathToArduinoSketchDir}`,
    );
    copyRecursive(
      `${this.pathToArduinoTemplateDir}/`,
      this.pathToArduinoSketchDir,
    );

    const exitCodeClean = await ArduinoClean(this.pathToArduinoSketchDir);
    if (exitCodeClean !== 0) {
      throw new Error(`Failed to perform ArduinoClean`);
    }

    if (!isFilePath(this.legacyConfigFile)) {
      // although we do not use the .config file
      // we need to create the .config file
      // otherwise the Makefile used
      // to build the Arduino.ino will crash
      writeFileSync(this.legacyConfigFile, '');
    }

    // compile the source code
    createDirectoryIfUnexisting(this.pathToArduinoWasmBinaryDir);
    this._sourceCodeCompiler = makeSourceCodeCompiler(
      selectedLanguage,
      this.pathToArduinoWasmBinaryDir,
    );
  }

  async compileSourceCode(
    compilationArgs: any,
    maxWaitTime?: number,
  ): Promise<number> {
    this._languageAdaptor = await maybeTimeoutPromise(
      this.compiler.compile(compilationArgs),
      maxWaitTime,
    );
    if (this._languageAdaptor === undefined) {
      this.logger.info(`Could not compile source code for file`);
      return -1;
    }
    return 0;
  }

  async buildForPlatform(
    compilerArgs: any,
    maxWaitTime?: number,
  ): Promise<number> {
    const exitCodeSourceCodeComp = await this.compileSourceCode(
      compilerArgs,
      maxWaitTime,
    );
    if (exitCodeSourceCodeComp !== 0) {
      return exitCodeSourceCodeComp;
    }

    if (this._languageAdaptor === undefined) {
      return -1;
    }

    let wasmPath = this._languageAdaptor.sourceMap.wasm.wasmPath;
    const filename = getFileName(wasmPath);
    if (filename === 'upload.wasm') {
      // special case where the output file has the same name as the file used to flash.
      // rename file to avoid conflicts
      wasmPath = await renameFile(wasmPath, `tmp-name-${filename}`);
    }

    const di = this.config.deviceIdentity;
    this.logger.info(
      `Arduino compiling sketch ${this.pathToArduinoSketchDir} for ${di.name} (board=${this.config.vmConfig.fqbn.boardName}, ID=${di.id})`,
    );
    const exitCodeCompile = await ArduinoCompile(
      this.config.vmConfig.fqbn.fqbn,
      wasmPath,
      this.pathToArduinoSketchDir,
      this.config.vmConfig.pauseOnStart,
    );
    if (exitCodeCompile === 0) {
      this.config.vmConfig.program =
        this._languageAdaptor.sourceMap.wasm.wasmPath;
    }

    return exitCodeCompile;
  }

  async upload(): Promise<number> {
    this.logger.info(
      `Arduino flashing sketch ${this.pathToArduinoSketchDir} for ${this.config.deviceIdentity.name} (board=${this.config.vmConfig.fqbn.boardName}, ID=${this.config.deviceIdentity.id})`,
    );
    return await ArduinoFlash(
      this.pathToArduinoSketchDir,
      this.config.vmConfig.serialPort,
      this.config.vmConfig.fqbn.fqbn,
      this.config.vmConfig.program,
    );
  }

  private async readLastBuildConfig(): Promise<CompiledCacheConfig> {
    const filePath = this.lastCompiledCacheConfigPath;
    const c: CompiledCacheConfig = await readFileAsJSON(filePath);
    return c;
  }

  private saveCompileConfig(deviceId: string, vmConfig: VMConfiguration): void {
    const pathToInoSketch = path.join(
      this.pathToArduinoSketchDir,
      'Arduino.ino',
    );
    const headerFile = path.join(this.pathToArduinoWasmBinaryDir, 'upload.h');
    const pathToWasm = path.join(
      this.pathToArduinoWasmBinaryDir,
      'upload.wasm',
    );
    const c: CompiledCacheConfig = {
      deviceId,
      fqbn: vmConfig.fqbn.fqbn,
      baudrate: vmConfig.baudrate,
      pauseOnStart: vmConfig.pauseOnStart,
      wasmSha256: sha256ForFile(pathToWasm),
      uploadHeaderSha256: sha256ForFile(headerFile),
      inoSha256: sha256ForFile(pathToInoSketch),
    };
    const content = JSON.stringify(c);
    writeFileSync(this.lastCompiledCacheConfigPath, content);
  }

  private hasAllTemplateFiles(): boolean {
    // if no Arduino present, force copy of template dir
    const pathToInoSketch = path.join(
      this.pathToArduinoSketchDir,
      'Arduino.ino',
    );
    if (!isFilePath(pathToInoSketch)) {
      return false;
    }

    // if header got removed, force copy of template dir
    const headerFile = path.join(this.pathToArduinoWasmBinaryDir, 'upload.h');
    if (!isFilePath(headerFile)) {
      return false;
    }

    // if wasm upload got removed, force copy of template dir
    const wasmUpload = path.join(
      this.pathToArduinoWasmBinaryDir,
      'upload.wasm',
    );
    if (!isFilePath(wasmUpload)) {
      return false;
    }

    // if no .config file force copy of template dir
    if (!isFilePath(this.legacyConfigFile)) {
      return false;
    }

    const templateIno = path.join(
      this.pathToArduinoSketchDir,
      'Arduino.ino.template',
    );
    if (!isFilePath(templateIno)) {
      return false;
    }

    const makeFilePath = path.join(this.pathToArduinoSketchDir, 'Makefile');
    if (!isFilePath(makeFilePath)) {
      return false;
    }
    return true;
  }
}
