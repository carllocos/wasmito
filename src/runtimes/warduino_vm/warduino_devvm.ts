import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { WARDuinoRuntimeAPI } from './warduino_vm';
import { ClientSideSocket } from '../../communication/client_socket';
import { getFreePort } from '../../util/socket_util';

// TODO fix this path to come from a config file
export const WarduinoBinaryPath = path.resolve(
  './libs/ArduinoWARDuino/WARDuino/build-emu/wdcli',
);

export class WARDuinoDevBackend extends WARDuinoRuntimeAPI {
  private readonly vmBin: string;
  private process?: ChildProcess;
  private readonly wasmPath: string;
  private debugPort: number;

  constructor(wasmPath: string, pathToVMBin: string = WarduinoBinaryPath) {
    super(new ClientSideSocket(-1, 'localhost', 'DevBackend'));
    this.vmBin = pathToVMBin;
    this.wasmPath = wasmPath;
    this.debugPort = -1;
    this.runtimeName = 'WARDuinoDev';
  }

  override async startRuntime(timeout: number): Promise<boolean> {
    if (!(await super.startRuntime(timeout))) {
      throw new Error(`Failed to start WARDuinoRuntimeAPI`);
    }
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

  async openConnection(timeout?: number): Promise<boolean> {
    return this.channel.open(timeout);
  }

  async closeConnection(timeout?: number): Promise<boolean> {
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
