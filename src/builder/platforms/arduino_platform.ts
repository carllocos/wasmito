import { exec, spawn } from 'child_process';
import { createLogger } from '../../logger/logger';
import { type PlatformBuilderConfig, type BoardFQBN } from '../platform_config';
import { PlatformBuilder } from '../platformbuilder';
import {
  copyRecursive,
  createDirectoryIfUnexisting,
  getAbsolutePath,
  getFileName,
  renameFile,
} from '../../util/file_util';
import { makeSourceCodeCompiler } from '../../source_mappers/compilers/compiler_factory';
import path from 'path';

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
      if (vals[1] === 'serial') {
        return vals[0];
      }
      return '';
    })
    .filter((ports) => {
      return ports !== '';
    });
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
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const compile = spawn(
      'make',
      ['compile', `FQBN=${fqbn}`, `BINARY=${wasmBinaryPath}`, 'PAUSED=true'],
      {
        cwd: outputDir,
      },
    );

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

export class ArduinoBoardBuilder extends PlatformBuilder {
  private readonly pathToArduinoTemplateDir: string;
  private readonly pathToArduinoSketchDir: string;
  private readonly pathToArduinoWasmBinaryDir: string;

  constructor(config: PlatformBuilderConfig, outputDir: string = '') {
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

  async compile(sourceFile: string): Promise<number> {
    // copy Arduino template
    this.logger.info(
      `Copying Arduino template for ${this.platformConfig.deviceConfig.name} (board=${this.platformConfig.fqbn.boardName}, ID=${this.platformConfig.deviceConfig.id}) from ${this.pathToArduinoTemplateDir} to ${this.pathToArduinoSketchDir}`,
    );
    await copyRecursive(
      `${this.pathToArduinoTemplateDir}/*`,
      this.pathToArduinoSketchDir,
    );

    const exitCodeClean = await ArduinoClean(this.pathToArduinoSketchDir);
    if (exitCodeClean !== 0) {
      return exitCodeClean;
    }

    // compile the source code
    createDirectoryIfUnexisting(this.pathToArduinoWasmBinaryDir);
    this.sourceCodeCompiler = makeSourceCodeCompiler(
      sourceFile,
      this.pathToArduinoWasmBinaryDir,
    );
    this.sourceMap = await this.sourceCodeCompiler.compile(sourceFile);
    if (this.sourceMap === undefined) {
      this.logger.info(`Could not compile source code for file ${sourceFile}`);
      return -1;
    }

    this.logger.info(
      `Arduino compiling sketch ${this.pathToArduinoSketchDir} for ${this.platformConfig.deviceConfig.name} (board=${this.platformConfig.fqbn.boardName}, ID=${this.platformConfig.deviceConfig.id})`,
    );

    let wasmPath = this.sourceMap.getWasmPath();
    const filename = getFileName(wasmPath);
    if (filename === 'upload.wasm') {
      // special case where the output file has the same name as the file used to flash.
      // rename file to avoid conflicts
      wasmPath = await renameFile(wasmPath, `tmp-name-${filename}`);
    }

    const exitCodeCompile = await ArduinoCompile(
      this.platformConfig.fqbn.fqbn,
      wasmPath,
      this.pathToArduinoSketchDir,
    );

    return exitCodeCompile;
  }

  async upload(): Promise<number> {
    this.logger.info(
      `Arduino flashing sketch ${this.pathToArduinoSketchDir} for ${this.platformConfig.deviceConfig.name} (board=${this.platformConfig.fqbn.boardName}, ID=${this.platformConfig.deviceConfig.id})`,
    );
    return await ArduinoFlash(
      this.pathToArduinoSketchDir,
      this.platformConfig.deviceConfig.port,
      this.platformConfig.fqbn.fqbn,
    );
  }
}
