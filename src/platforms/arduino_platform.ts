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
  pathJoin,
  readFileAsJSON,
  sha256ForFile,
} from '../util/file_util';
import { makeSourceCodeCompiler } from '../compilers/compiler_factory';
import path from 'path';
import { type ProgLangSelectionArgs } from '../compilers/prog_language_selection';
import { maybeTimeoutPromise } from '../util/promise_util';
import { type BoardBaudRate, isSerialPort } from '../util/serial_port';
import { copyFile, writeFileSync } from 'fs';
import { type VMConfiguration } from '../device';
import { wasmStripCustomSection } from '../wasm-tools/wasm_strip';
import {
  getPathArduinoCLI,
  getPathArduinoConfig,
  getPathArduinoLibsPath,
} from '../project_config';

const arduinoLogger = createLogger('Arduino');

export class ArduinoBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArduinoBuilderError';
    Error.captureStackTrace(this, ArduinoBuilderError);
  }
}

export async function runArduinoCommand(command: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    arduinoLogger.info(`Running command: ${command}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    exec(`${command}`, (error, stdout, stderr) => {
      if (error !== null) {
        reject(error);
      }
      resolve(stdout.trim());
    });
  });
}

export async function ArduinoListBoards(): Promise<string[]> {
  const arduino_cli = getPathArduinoCLI();
  const arduino_config = getPathArduinoConfig();
  let cmd = `${arduino_cli} board list`;
  if (arduino_config !== undefined) {
    cmd = `${cmd} --config-file ${arduino_config}`;
  }
  const cmdOutput = await runArduinoCommand(cmd);
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
  const arduino_cli = getPathArduinoCLI();
  const arduino_config = getPathArduinoConfig();
  let cmd = `${arduino_cli} board listall`;
  if (arduino_config !== undefined) {
    cmd = `${cmd} --config-file ${arduino_config}`;
  }
  const cmdOutput = await runArduinoCommand(cmd);
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
  disableStrictModuleLoad: boolean;
  inoSha256: string;
  wasmSha256: string;
  uploadHeaderSha256: string;
  baudrate: BoardBaudRate;
  wasmNoCustomSec: string;
}

export async function ArduinoCompile(
  fqbn: string,
  wasmBinaryPath: string,
  arduinoSketchDir: string,
  paused: boolean,
  disableStrictModuleLoad: boolean,
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const makeArgs = [
      'compile',
      `FQBN=${fqbn}`,
      `BINARY=${wasmBinaryPath}`,
      `DISABLESTRICTMODULELOAD=${disableStrictModuleLoad}`,
      `ARDUINO_CLI=${getPathArduinoCLI()}`,
      `ARDUINO_LIBS=${getPathArduinoLibsPath()}`,
    ];

    const arduinoConfig = getPathArduinoConfig();
    if (arduinoConfig !== undefined) {
      makeArgs.push(`ARDUINO_CONFIG=${arduinoConfig}`);
    }

    if (paused) {
      makeArgs.push('PAUSED=true');
    }
    const compile = spawn('make', makeArgs, {
      cwd: arduinoSketchDir,
    });

    compile.stdout.on('data', (data) => {
      const d = data.toString();
      arduinoLogger.debug(d);
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

export async function ArduinoFlash(
  pathToArduinoSketch: string,
  port: string,
  fqbn: string,
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const makeArgs = ['flash', `PORT=${port}`, `FQBN=${fqbn}`];

    const arduinoLib = getPathArduinoCLI();
    if (arduinoLib !== undefined) {
      makeArgs.push(`ARDUINO_CLI=${arduinoLib}`);
    }

    const arduinoConfig = getPathArduinoConfig();
    if (arduinoConfig !== undefined) {
      makeArgs.push(`ARDUINO_CONFIG=${arduinoConfig}`);
    }

    const flash = spawn('make', makeArgs, {
      cwd: pathToArduinoSketch,
    });
    flash.stdout.on('data', (data) => {
      const d = data.toString();
      arduinoLogger.debug(d);
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

export async function ArduinoClean(arduinoSketchDir: string): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const clean = spawn('make', ['clean'], {
      cwd: arduinoSketchDir,
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
  private readonly pathToWasms: string;

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
    this.pathToWasms = path.join(this.pathToArduinoSketchDir, 'wasms');
  }

  async createCompiler(selectedLanguage: ProgLangSelectionArgs): Promise<void> {
    if (!this.hasAllTemplateFiles()) {
      // copy Arduino template
      this.logger.info(
        `Copying Arduino template for ${this.config.deviceIdentity.name} (board=${this.config.vmConfig.fqbn.boardName}, ID=${this.config.deviceIdentity.id}) from ${this.pathToArduinoTemplateDir} to ${this.pathToArduinoSketchDir}`,
      );
      copyRecursive(
        `${this.pathToArduinoTemplateDir}/`,
        this.pathToArduinoSketchDir,
      );
      if (!isFilePath(this.legacyConfigFile)) {
        // although we do not use the .config file
        // we need to create the .config file
        // otherwise the Makefile used
        // to build the Arduino.ino will crash
        writeFileSync(this.legacyConfigFile, '');
      }
    }

    createDirectoryIfUnexisting(this.pathToWasms);

    if (!this.cachePlatformBuild) {
      const exitCodeClean = await ArduinoClean(this.pathToArduinoSketchDir);
      if (exitCodeClean !== 0) {
        throw new Error(`Failed to perform ArduinoClean`);
      }
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

    const wasmPath = this._languageAdaptor.sourceMap.wasm.wasmPath;
    const di = this.config.deviceIdentity;
    let exitCodeCompile = 0;
    let wasmNoCustomSec = '';
    if (
      !this.cachePlatformBuild ||
      (await this.changedSinceLastBuild(wasmPath, this.config.vmConfig, di.id))
    ) {
      const exitCodeClean = await ArduinoClean(this.pathToArduinoSketchDir);
      if (exitCodeClean !== 0) {
        throw new Error(`Failed to perform ArduinoClean`);
      }

      wasmNoCustomSec = await this.prepareWasm(
        this._languageAdaptor.sourceMap.wasm.wasmPath,
      );
      this.logger.info(
        `Arduino compiling sketch ${this.pathToArduinoSketchDir} for ${di.name} (board=${this.config.vmConfig.fqbn.boardName}, ID=${di.id})`,
      );
      exitCodeCompile = await ArduinoCompile(
        this.config.vmConfig.fqbn.fqbn,
        wasmNoCustomSec,
        this.pathToArduinoSketchDir,
        this.config.vmConfig.pauseOnStart,
        this.config.vmConfig.disableStrictModuleLoad,
      );
    } else {
      this.logger.info(
        `Using cached 'Arduino.ino' build for '${this.config.deviceIdentity.fullname}'`,
      );
    }

    if (exitCodeCompile === 0) {
      this.config.vmConfig.program =
        this._languageAdaptor.sourceMap.wasm.wasmPath;
      this.saveCompileConfig(di.id, wasmNoCustomSec, this.config.vmConfig);
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
    );
  }

  private async changedSinceLastBuild(
    wasmPathToDeploy: string,
    vmConfig: VMConfiguration,
    deviceId: string,
  ): Promise<boolean> {
    if (!isFilePath(this.lastCompiledCacheConfigPath)) {
      // this file gets created after the first compilation
      // if absent then it is the first compilation
      // and should therefore happen
      return true;
    }

    const buildConfig = await this.readLastBuildConfig();

    if (buildConfig.deviceId !== deviceId) {
      // Arduino.ino was build for another device
      // force recompilation
      return true;
    }
    if (buildConfig.pauseOnStart !== vmConfig.pauseOnStart) {
      // VM has changed to no longer pause on start
      return true;
    }

    if (
      buildConfig.disableStrictModuleLoad !== vmConfig.disableStrictModuleLoad
    ) {
      // VM has changed the strict module parse
      return true;
    }

    if (buildConfig.fqbn !== vmConfig.fqbn.fqbn) {
      // VM has changed fqbn
      return true;
    }

    if (buildConfig.baudrate !== vmConfig.baudrate) {
      // VM has changed fqbn
      return true;
    }

    if (!this.hasAllTemplateFiles()) {
      return true;
    }

    const shaNew = sha256ForFile(wasmPathToDeploy);
    if (shaNew !== buildConfig.wasmSha256) {
      return true;
    }

    const headerFile = path.join(this.pathToArduinoWasmBinaryDir, 'upload.h');
    const headerSha = sha256ForFile(headerFile);
    if (headerSha !== buildConfig.uploadHeaderSha256) {
      return true;
    }

    const pathToInoSketch = path.join(
      this.pathToArduinoSketchDir,
      'Arduino.ino',
    );

    const inoSha = sha256ForFile(pathToInoSketch);
    if (inoSha !== buildConfig.inoSha256) {
      return true;
    }

    return false;
  }

  private async prepareWasm(wasmPath: string): Promise<string> {
    const copiedWasm = await this.copyWasm(wasmPath);
    return this.reduceWasmInSize(copiedWasm);
  }

  private async reduceWasmInSize(wasmPath: string): Promise<string> {
    const outputFile = pathJoin(this.pathToWasms, 'no_custom_sec.wasm');
    const [exitCode, stdout, stderr] = await wasmStripCustomSection(
      wasmPath,
      outputFile,
    );
    if (exitCode !== 0) {
      this.logger.error(
        `wasm-tools strip give error: ${stderr}\n\nstdout of wasm-tools strip ${stdout}`,
      );
      throw new Error(`wasm-tools 'strip' failed on ${wasmPath}`);
    }
    return outputFile;
  }

  private async copyWasm(wasmPath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let filename = getFileName(wasmPath);
      if (filename === 'upload.wasm') {
        // special case where the output file has the same name as the file used to flash.
        // rename file to avoid conflicts
        filename = `tmp-name-${filename}`;
      }
      const filePath = pathJoin(this.pathToWasms, filename);
      copyFile(wasmPath, filePath, (err: NodeJS.ErrnoException | null) => {
        if (err !== null && err !== undefined) {
          const errMsg = `Error occurred while copying wasm from ${wasmPath} to ${filePath} (error no ${err.errno}):\n${err.message}`;
          reject(errMsg);
        } else {
          resolve(filePath);
        }
      });
    });
  }

  private async readLastBuildConfig(): Promise<CompiledCacheConfig> {
    const filePath = this.lastCompiledCacheConfigPath;
    const c: CompiledCacheConfig = await readFileAsJSON(filePath);
    return c;
  }

  private saveCompileConfig(
    deviceId: string,
    wasmNoCustomSec: string,
    vmConfig: VMConfiguration,
  ): void {
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
      disableStrictModuleLoad: vmConfig.disableStrictModuleLoad,
      wasmSha256: sha256ForFile(pathToWasm),
      uploadHeaderSha256: sha256ForFile(headerFile),
      inoSha256: sha256ForFile(pathToInoSketch),
      wasmNoCustomSec,
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

  async getUploadedWasm(): Promise<string | undefined> {
    if (this._languageAdaptor !== undefined) {
      return this._languageAdaptor.sourceMap.wasm.wasmPath;
    } else if (this.config.vmConfig.hasWasmPath()) {
      return this.config.vmConfig.program;
    }
    if (!isFilePath(this.lastCompiledCacheConfigPath)) {
      return undefined;
    }
    const expectedPath = path.join(
      this.pathToArduinoWasmBinaryDir,
      'upload.wasm',
    );
    if (!isFilePath(expectedPath)) {
      return undefined;
    }

    const c = await this.readLastBuildConfig();
    const sha = sha256ForFile(expectedPath);
    if (c.wasmSha256 === sha) {
      return expectedPath;
    }
    return undefined;
  }
}
