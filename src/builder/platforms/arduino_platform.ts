import { exec, spawn } from 'child_process';
import { createLogger } from '../../logger/logger';
import { type PlatformConfig, type BoardFQBN } from '../platform_config';
import { Platform } from '../platform';
import {
  copyRecursive,
  createDirectoryIfUnexisting,
  getAbsolutePath,
  getFileName,
  renameFile,
} from '../../util/file_util';
import { makeSourceCodeCompiler } from '../../source_mappers/compilers/compiler_factory';
import path from 'path';
import { type ProgLangSelectionArgs } from '../../source_mappers/compilers/prog_language_selection';
import { maybeTimeoutPromise } from '../../util/promise_util';
import { isSerialPort } from '../../util/serial_port';

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

export async function ArduinoCompile(
  fqbn: string,
  wasmBinaryPath: string,
  outputDir: string,
  paused: boolean,
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const makeArgs = ['compile', `FQBN=${fqbn}`, `BINARY=${wasmBinaryPath}`];
    if (paused) {
      makeArgs.push('PAUSED');
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
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const flash = spawn('make', ['flash', `PORT=${port}`, `FQBN=${fqbn}`], {
      cwd: pathToArduinoSketch,
    });
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
    this._sourceMap = await maybeTimeoutPromise(
      this.compiler.compile(compilationArgs),
      maxWaitTime,
    );
    if (this._sourceMap === undefined) {
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

    const di = this.config.deviceIdentity;
    this.logger.info(
      `Arduino compiling sketch ${this.pathToArduinoSketchDir} for ${di.name} (board=${this.config.vmConfig.fqbn.boardName}, ID=${di.id})`,
    );

    if (this._sourceMap === undefined) {
      return -1;
    }

    let wasmPath = this._sourceMap.getWasmPath();
    const filename = getFileName(wasmPath);
    if (filename === 'upload.wasm') {
      // special case where the output file has the same name as the file used to flash.
      // rename file to avoid conflicts
      wasmPath = await renameFile(wasmPath, `tmp-name-${filename}`);
    }

    const exitCodeCompile = await ArduinoCompile(
      this.config.vmConfig.fqbn.fqbn,
      wasmPath,
      this.pathToArduinoSketchDir,
      this.config.vmConfig.pauseOnStart,
    );
    if (exitCodeCompile === 0) {
      this.config.vmConfig.program = this._sourceMap.getWasmPath();
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
}
