import { spawn, type ChildProcess } from 'child_process';
import { WARDuinoVM } from './warduino_vm';
import {
  // type VMConfigArgs,
  type VMConfiguration,
} from '../../device/vm_config';
import { ClientSideSocket } from '../../communication/client_socket';
import type winston from 'winston';
import { createLogger } from '../../logger/logger';
// import { PlatformTarget, PlatformConfig } from '../../builder/platform_config';
import { UpdateWasmModuleRequest } from '../requests/update_module_request';
import { getPath2WARDuinoSDKVMBinary } from '../../project_config';
import { getFreePort, isPortInUse } from '../../util/socket_util';
import { NoChannel } from '../../communication/no_channel';
// import { BoardBaudRate } from '../../util/serial_port';
// import { type ProgLangSelectionArgs } from '../../source_mappers/compilers/prog_language_selection';
import { type Channel } from '../../communication';
import { type DevVMPlatform } from '../../builder';

export class WARDuinoDevVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WARDuinoDevVMError';
    Error.captureStackTrace(this, WARDuinoDevVMError);
  }
}

export class WARDuinoDevVM extends WARDuinoVM {
  protected logger: winston.Logger;
  protected process?: ChildProcess;
  protected ErrorClass = WARDuinoDevVMError;

  constructor(platform: DevVMPlatform, channel?: Channel) {
    // buildOutputDir?: string, // vmConfigArgs: VMConfigArgs, // deviceConfigArgs: DeviceIdentity,
    super(
      // createPlatformBuilderConfig(
      //   selectedLanguage,
      //   deviceConfigArgs,
      //   vmConfigArgs,
      // ),
      platform,
      channel ?? new NoChannel(),
      // buildOutputDir,
    );

    // if (this.vmConfig.hasToolPort()) {
    //   this.channel = new ClientSideSocket(
    //     this.vmConfig.toolPort,
    //     this.vmConfig.toolHostIP,
    //     this.deviceConfig.fullname,
    //   );
    // }
    this.logger = createLogger(
      `WARDuinoDevVM ${platform.config.deviceIdentity.fullname}`,
    );
    this.logger.error(
      `TODO reassing channel to be client-side socket as comment above`,
    );
  }

  // get vmConfig(): VMConfiguration {
  //   return this.platformConfig.deviceConfig.vmConfig;
  // }

  // get deviceConfig(): DeviceConfig {
  //   return this.platformConfig.deviceConfig;
  // }

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
    await this.assertExistanceToolPort();
    const vmConfig = this.platform.config.vmConfig;

    this.channel = new ClientSideSocket(
      vmConfig.toolPort,
      vmConfig.toolHostIP,
      this.deviceIdentity.fullname,
    );
    // await this.platform.createCompiler();

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
    const spawnCommand = getPath2WARDuinoSDKVMBinary();
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

  protected async assertExistanceToolPort(): Promise<void> {
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
