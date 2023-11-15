import { exec, spawn } from 'child_process';
import { createLogger } from '../../logger/logger';
import { type PlatformBuilderConfig, type BoardFQBN } from '../platform_config';
import { PlatformBuilder } from '../platformbuilder';
import { copyRecursive } from '../../util/file_util';

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
      ['recompile', `FQBN=${fqbn}`, `BINARY=${wasmBinaryPath}`, 'PAUSED=true'],
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
      reject(errMsg);
    });

    compile.on('close', (code) => {
      arduinoLogger.info(`Arduino compilation exited with code ${code}`);
      if (code !== null) {
        resolve(code);
      }
      reject(
        new Error(`Arduino compilation exit code is not a number: ${code}`),
      );
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
      reject(errMsg);
    });

    flash.on('close', (code) => {
      arduinoLogger.info(`Arduino flashing exited with code ${code}`);
      if (code !== null) {
        resolve(code);
      }
      reject(new Error(`Arduino flashing exit code is not a number: ${code}`));
    });
  });
}

export class ArduinoBoardBuilder extends PlatformBuilder {
  private readonly pathToArduinoTemplate: string;
  private readonly pathToArduinoSketch: string;

  constructor(config: PlatformBuilderConfig, outputDir: string = '') {
    super(config, outputDir);
    this.pathToArduinoTemplate = `${this.sdkPath}platforms/Arduino`;
    this.pathToArduinoSketch = `${this.outputDirectory}/Arduino/`;
  }

  async compile(sourceFile: string): Promise<number> {
    // copy Arduino template
    await copyRecursive(
      `${this.pathToArduinoTemplate}/*`,
      this.pathToArduinoSketch,
    );
    return await ArduinoCompile(
      this.platformConfig.fqbn.fqbn,
      sourceFile,
      this.pathToArduinoSketch,
    );
  }

  async upload(): Promise<number> {
    return await ArduinoFlash(
      this.pathToArduinoSketch,
      this.platformConfig.deviceConfig.port,
      this.platformConfig.fqbn.fqbn,
    );
  }
}
