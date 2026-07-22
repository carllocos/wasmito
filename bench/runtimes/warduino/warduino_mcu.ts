import { spawn } from 'child_process';
import path from 'path';
import { WARDuinoRuntimeAPI } from './warduino_runtime_api';
import { isFilePath } from '../../../src/util/file_util';
import { waitMilliSeconds } from '../../../src/util/promise_util';
import { SerialConnection } from '../../../src/communication/serial';

// export const ArduinoLibsDir = path.resolve('./libs/ArduinoWARDuino/WARDuino/');
export const ArduinoLibsDir = path.resolve('./libs/ArduinoWARDuino/');

export class WARDuinoBackendMCU extends WARDuinoRuntimeAPI {
  private readonly wasmPath: string;
  runtimeName: string = 'WARDuinoMCU';
  private readonly arduinoLibsDir: string;
  private readonly arduinoSketchDir: string;
  private readonly fqbn: string;
  private readonly serialPort: string;

  constructor(
    wasmPath: string,
    serialPort: string,
    fqbn: string,
    baudrate: number,
    arduinoLibsDir: string = ArduinoLibsDir,
  ) {
    super(new SerialConnection(serialPort, baudrate));
    this.wasmPath = checkIfNoCustomWasmExists(wasmPath);
    this.arduinoLibsDir = arduinoLibsDir;
    this.fqbn = fqbn;
    this.serialPort = serialPort;
    this.arduinoSketchDir = path.join(
      this.arduinoLibsDir,
      'WARDuino',
      'platforms',
      'Arduino',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override async startRuntime(timeout: number): Promise<boolean> {
    await ArduinoClean(this.arduinoSketchDir);
    await this.compileForMCU(this.wasmPath);
    await this.uploadWasmToMCU();
    await waitMilliSeconds(1000);
    return true;
  }

  override async stopRuntime(timeout: number): Promise<boolean> {
    return await this.closeConnection(timeout);
  }

  async openConnection(timeout?: number): Promise<boolean> {
    return this.channel.open(timeout);
  }

  async compileForMCU(wasmPath: string): Promise<void> {
    await this.closeConnection();
    const exitCode = await ArduinoCompile(
      this.arduinoLibsDir,
      this.arduinoSketchDir,
      this.fqbn,
      wasmPath,
    );
    if (exitCode !== 0) {
      throw new Error(
        `Compilation failed for arduinoLibsDir=${this.arduinoLibsDir} fqbn=${this.fqbn} wasmPath=${wasmPath} sketch=${this.arduinoSketchDir}`,
      );
    }
  }

  async uploadWasmToMCU(): Promise<void> {
    await this.closeConnection();
    const flashed = await ArduinoFlash(
      this.arduinoSketchDir,
      this.serialPort,
      this.fqbn,
    );
    if (flashed !== 0) {
      throw new Error(
        `Upload failed for MCU arduinoSketchDir=${this.arduinoSketchDir} fqbn=${this.fqbn} serialPort=${this.serialPort}`,
      );
    }
    await this.openConnection();
  }

  private async closeConnection(timedout?: number): Promise<boolean> {
    console.info('closing VM');
    const closedChannel = await this.channel.close(timedout);
    console.debug(
      closedChannel
        ? 'VM channel successfully closed'
        : 'VM channel could not be closed',
    );
    return closedChannel;
  }
}

function checkIfNoCustomWasmExists(wasmPath: string): string {
  const wasmName = `${path.basename(wasmPath, '.wasm')}_no_custom.wasm`;
  const dirPath = path.dirname(wasmPath);
  const shortWasm = path.join(dirPath, wasmName);
  if (!isFilePath(shortWasm)) {
    throw new Error(
      `No wasm without cutom section found with name ${wasmName} for wasm ${wasmPath}`,
    );
  }
  return shortWasm;
}

async function ArduinoCompile(
  libsDir: string,
  sketchDir: string,
  fqbn: string,
  wasmBinaryPath: string,
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const makeArgs = [
      'compile',
      `FQBN=${fqbn}`,
      `BINARY=${wasmBinaryPath}`,
      `LIBS=${libsDir}`,
      `PAUSED=true`,
    ];
    const compile = spawn('make', makeArgs, {
      cwd: sketchDir,
    });

    compile.stdout.on('data', (data) => {
      const d = data.toString();
      console.debug(d);
    });

    compile.stderr.on('data', (data: string) => {
      const errMsg = data.toString();
      console.error(errMsg);
    });

    compile.on('close', (code) => {
      if (code !== null) {
        const msg = `Arduino compilation exited with code ${code}`;
        if (code === 0) {
          console.info(msg);
        } else {
          console.error(msg);
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
      const d = data.toString();
      console.debug(d);
    });

    flash.stderr.on('data', (data: string) => {
      const errMsg = data.toString();
      console.error(errMsg);
    });

    flash.on('close', (code) => {
      if (code !== null) {
        const msg = `Arduino flashing exited with code ${code}`;
        if (code === 0) {
          console.info(msg);
        } else {
          console.error(msg);
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

async function ArduinoClean(outputDir: string): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const clean = spawn('make', ['clean'], {
      cwd: outputDir,
    });

    clean.stdout.on('data', (data) => {
      console.debug(data.toString());
    });

    clean.stderr.on('data', (data: string) => {
      const errMsg = data.toString();
      console.error(errMsg);
    });

    clean.on('close', (code) => {
      if (code !== null) {
        const msg = `Arduino clean exited with code ${code}`;
        if (code === 0) {
          console.debug(msg);
        } else {
          console.error(msg);
        }
        resolve(code);
      } else {
        reject(new Error(`Arduino clean exit code is not a number: ${code}`));
      }
    });
  });
}
