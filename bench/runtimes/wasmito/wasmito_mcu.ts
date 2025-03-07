import path from 'path';
import { WasmitoRuntimeDBGAPI } from './wasmito_runtime_api';
import { SerialConnection } from '../../../src/communication/serial';
import {
  ArduinoClean,
  ArduinoCompile,
  ArduinoFlash,
} from '../../../src/platforms/arduino_platform';
import { waitMilliSeconds } from '../../../src/util/promise_util';
import { isFilePath } from '../../../src/util/file_util';

export const ArduinoLibsDir = path.resolve('./libs/Wasmito-runtime/');

export class WasmitoBackendMCUVM extends WasmitoRuntimeDBGAPI {
  private readonly wasmPath: string;
  runtimeName: string = 'WasmitoBackendMCU';
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
      'platforms',
      'Arduino',
    );
  }

  override async startRuntime(timeout: number): Promise<boolean> {
    if (!(await super.startRuntime(timeout))) {
      throw new Error(`wasmito runtime API could not be started`);
    }
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
      this.fqbn,
      wasmPath,
      this.arduinoSketchDir,
      true,
      false,
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
