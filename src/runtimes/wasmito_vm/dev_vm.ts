import { spawn, type ChildProcess } from 'child_process';
import { WasmitoBackendVM } from './wasmito_vm';
import { type VMConfiguration } from '../../device/vm_config';
import { ClientSideSocket } from '../../communication/client_socket';
import type winston from 'winston';
import { createLogger } from '../../logger/logger';
import { UpdateWasmModuleRequest } from './requests/update_module_request';
import { getPath2WasmitoSDKVMBinary } from '../../project_config';
import { getFreePort, isPortInUse } from '../../util/socket_util';
import { type Channel } from '../../communication';
import { type DevVMPlatform } from '../../platforms';

export class WasmitoDevVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WasmitoDuinoDevVMError';
    Error.captureStackTrace(this, WasmitoDevVMError);
  }
}

export class WasmitoDevVM extends WasmitoBackendVM {
  protected logger: winston.Logger;
  protected process?: ChildProcess;
  protected ErrorClass = WasmitoDevVMError;

  constructor(platform: DevVMPlatform, channel?: Channel) {
    super(platform, channel ?? new ClientSideSocket(-1, 'localhost', ''));

    this.logger = createLogger(
      `WasmitoDevVM ${platform.config.deviceIdentity.fullname}`,
    );
  }

  async close(timeout?: number): Promise<boolean> {
    this.logger.info('closing VM');
    const closedChannel = await this.channel.close(timeout);
    const closedProcess = this.process?.kill() ?? true;
    this.logger.debug(
      closedChannel
        ? 'VM channel successfully closed'
        : 'VM channel could not be closed',
    );
    this.logger.debug(
      closedProcess
        ? 'VM Process successfully killed'
        : 'VM process could not be killed',
    );
    return closedChannel && closedProcess;
  }

  public isProcess(p: ChildProcess): boolean {
    return this.process === p;
  }

  public async uploadSourceCode(
    sourceCodeCompilerArgs: any,
    timeout?: number,
  ): Promise<boolean> {
    const exitCode = await this.platform.buildForPlatform(
      sourceCodeCompilerArgs,
    );
    if (exitCode !== 0) {
      return false;
    }

    const wasm = this.sourceMap.wasm.wasmBuffer;
    const updateRequest = new UpdateWasmModuleRequest(wasm);
    await this.sendRequest(updateRequest, timeout);
    return true;
  }

  public async spawn(
    sourceCodeCompilationArgs: any,
    maxWaitTime?: number,
  ): Promise<ChildProcess> {
    await this.assertExistenceToolPort();
    const vmConfig = this.platform.config.vmConfig;

    this.channel = new ClientSideSocket(
      vmConfig.toolPort,
      vmConfig.toolHostIP,
      this.deviceIdentity.fullname,
    );

    const exitCode = await this.platform.buildForPlatform(
      sourceCodeCompilationArgs,
    );
    if (exitCode !== 0) {
      throw new this.ErrorClass(
        `Could not start DevVM. Compilation exited with code: ${exitCode}`,
      );
    }

    const processArgs = this.buildProcessArguments(
      this.sourceMap.wasm.wasmPath,
      this.platform.config.vmConfig,
    );
    const spawnCommand = getPath2WasmitoSDKVMBinary();
    this.logger.info(
      `starting DevelopmentVM process ${spawnCommand} ${processArgs.join(' ')}`,
    );
    const childProcess = spawn(spawnCommand, processArgs);
    childProcess.stdout.on('data', (data) => {
      this.logger.debug(`(stdout) ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
      this.logger.error(`(stderr) ${data}`);
    });

    childProcess.on('exit', (exitCode: number | null) => {
      if (exitCode !== null && exitCode !== undefined) {
        if (exitCode > 0) {
          this.logger.error(`DevVM exited with exitCode ${exitCode}`);
        } else {
          this.logger.info(`DevVM exited with exitCode ${exitCode}`);
        }
      } else {
        this.logger.info(`DevVM exited`);
      }
    });

    const connected = await this.connect(maxWaitTime);
    if (!connected) {
      this.logger.error(
        `Failed to connect to local DevelopmentVM at port ${this.platform.config.vmConfig.toolPort}`,
      );
      this.logger.error('Killing local DevelopmentVM process');
      childProcess.kill();
      throw new this.ErrorClass('timed out connecting to DevVM process');
    }

    this.process = childProcess;

    return childProcess;
  }

  protected buildProcessArguments(
    programPath: string,
    args: VMConfiguration,
  ): string[] {
    const processArgs: string[] = [programPath];

    if (args.hasToolPort()) {
      processArgs.push('--socket');
      processArgs.push(args.toolPort.toString());
    }
    if (args.pauseOnStart) {
      processArgs.push('--paused');
    }
    if (args.disableStrictModuleLoad) {
      processArgs.push('--disable-strict-module-load');
    }
    return processArgs;
  }

  protected async assertExistenceToolPort(): Promise<void> {
    if (this.platform.config.vmConfig.hasToolPort()) {
      if (await isPortInUse(this.platform.config.vmConfig.toolPort)) {
        throw new this.ErrorClass(
          `Cannot spawn a DevelopmentVM on Port ${this.platform.config.vmConfig.toolPort} as it is already in use`,
        );
      }
    } else {
      this.logger.info('No toolPort provided so will open a free port');
      const openPort = await getFreePort();
      if (openPort === undefined) {
        throw new this.ErrorClass(
          'Cannot spawn a DevelopmentVM as no free port was found',
        );
      }
      this.logger.info(
        `No toolPort provided so will start using port ${openPort}`,
      );
      this.platform.config.vmConfig.toolPort = openPort;
    }
  }
}
