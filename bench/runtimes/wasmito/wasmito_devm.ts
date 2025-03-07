import path from 'path';
import { type ChildProcess, spawn } from 'child_process';
import { ClientSideSocket } from '../../../src/communication/client_socket';
import { WasmitoRuntimeDBGAPI } from './wasmito_runtime_api';
import { getFreePort } from '../../../src/util/socket_util';

export const WasmitoBinaryPath = path.resolve(
  './libs/Wasmito-runtime/build-emu/wdcli',
);

export class WasmitoDevVM extends WasmitoRuntimeDBGAPI {
  private readonly vmBin: string;
  private debugPort: number;
  private process?: ChildProcess;

  private readonly wasmPath: string;
  runtimeName: string;

  constructor(wasmPath: string, pathToVMBin: string = WasmitoBinaryPath) {
    super(new ClientSideSocket(-1, 'localhost', ''));
    this.runtimeName = 'WasmitoDevVM';
    this.vmBin = pathToVMBin;
    this.wasmPath = wasmPath;
    this.debugPort = -1;
  }

  override async startRuntime(timeout: number): Promise<boolean> {
    const freePort = await getFreePort();
    if (freePort === undefined) {
      throw new Error(`Failed to find a free port for ${this.runtimeName}`);
    }
    this.debugPort = freePort;
    this.channel = new ClientSideSocket(
      freePort,
      'localhost',
      this.runtimeName,
    );
    await this.spawn(timeout);
    return true;
  }

  override async stopRuntime(timeout: number): Promise<boolean> {
    return await this.closeConnection(timeout);
  }

  private async closeConnection(timeout?: number): Promise<boolean> {
    console.info('closing VM');
    const closedChannel = await this.channel.close(timeout);
    const closedProcess = this.process?.kill() ?? true;
    console.debug(
      closedChannel
        ? 'VM channel successfully closed'
        : 'VM channel could not be closed',
    );
    console.debug(
      closedProcess
        ? 'VM Process successfully killed'
        : 'VM process could not be killed',
    );
    return closedChannel && closedProcess;
  }

  private async spawn(maxWaitTime: number): Promise<ChildProcess> {
    const processArgs = [
      this.wasmPath,
      '--socket',
      this.debugPort.toString(),
      '--paused',
    ];
    console.info(
      `starting DevelopmentVM process ${this.vmBin} ${processArgs.join(' ')}`,
    );
    const childProcess = spawn(this.vmBin, processArgs);
    childProcess.stdout.on('data', (data) => {
      console.debug(`(stdout) ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
      console.error(`(stderr) ${data}`);
    });

    const connected = await this.connect(maxWaitTime);
    if (!connected) {
      console.error(
        `Failed to connect to local DevelopmentVM at port ${this.debugPort}`,
      );
      console.error('Killing local DevelopmentVM process');
      childProcess.kill();
      throw new Error('timed out connecting to DevVM process');
    }

    this.process = childProcess;

    return childProcess;
  }

  private async connect(timeout: number): Promise<boolean> {
    const opened = await this.channel.open(timeout);
    if (opened) {
      console.info('connected');
    } else {
      console.error('failed to connect');
    }
    return opened;
  }
}
