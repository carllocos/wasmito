import { EmulatorSpawnArguments } from './emulator_config';
import type winston from 'winston';
import { getFreePort, isPortInUse } from '../util/socket_util';
import { spawn } from 'child_process';
import { createLogger } from '../logger/logger';
import { type DeviceConfig } from './device_config';
import { getPath2WARDuinoSDKEmulatorBinary } from '../project_config';
import { type Channel } from '../communication/channel_interface';
import { EmulatedWARDuinoVM } from '../warduino/vm/emulated_vm';
import { MCUWARDuinoVM } from '../warduino/vm/mcu_vm';
import { type PlatformBuilderConfig } from '../builder/platform_config';
import { SerialConnection } from '../communication/serial';
import { ClientSideSocket } from '../communication/client_socket';

export class DeviceManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceManagerError';
    Error.captureStackTrace(this, DeviceManagerError);
  }
}

export class DeviceManager {
  logger: winston.Logger;
  localprocesses: EmulatedWARDuinoVM[];

  constructor() {
    this.logger = createLogger('DeviceManager');
    this.localprocesses = [];
  }

  async correctSpawnArguments(
    args: EmulatorSpawnArguments,
  ): Promise<EmulatorSpawnArguments> {
    if (args.listenPort !== undefined) {
      if (await isPortInUse(args.listenPort)) {
        throw new DeviceManagerError(`Port ${args.listenPort} already in use`);
      }
    } else {
      const openPort = await getFreePort();
      if (openPort === undefined) {
        throw new DeviceManagerError('Could not find a free port');
      }
      args.listenPort = openPort;
    }
    return args;
  }

  private buildProcessArguments(args: EmulatorSpawnArguments): string[] {
    const processArgs: string[] = [args.program];

    if (args.listenPort !== undefined) {
      processArgs.push('--socket');
      processArgs.push(args.listenPort.toString());
    }
    if (args.pauseOnStart) {
      processArgs.push('--paused');
    }
    if (
      args.disableStrictModuleLoad !== undefined &&
      args.disableStrictModuleLoad
    ) {
      processArgs.push('--disable-strict-module-load');
    }
    return processArgs;
  }

  async connectToExistingEmulator(
    deviceConfig: DeviceConfig,
    maxWaitTime: number,
    buildOutputDir?: string,
  ): Promise<EmulatedWARDuinoVM> {
    const port: number | undefined = parseInt(deviceConfig.port, 10);
    if (isNaN(port)) {
      throw new DeviceManagerError('port number is missing');
    }
    const args: EmulatorSpawnArguments = new EmulatorSpawnArguments({
      program: deviceConfig.program,
      listenPort: port,
      pauseOnStart: true,
    });

    const noChildProcess = undefined;
    const emulatedDevice = new EmulatedWARDuinoVM(
      port,
      deviceConfig,
      args,
      noChildProcess,
      buildOutputDir,
    );
    const connected = await emulatedDevice.connect(maxWaitTime);
    if (!connected) {
      this.logger.info(
        `Failed to connect to local emulator process at port ${args.listenPort}`,
      );
      throw new DeviceManagerError('timed out connecting to emulator process');
    }
    this.localprocesses.push(emulatedDevice);
    return emulatedDevice;
  }

  async spawnEmulator(
    deviceConfig: DeviceConfig,
    maxWaitTime: number,
    buildOutputDir?: string,
  ): Promise<EmulatedWARDuinoVM> {
    let port: number | undefined = parseInt(deviceConfig.port, 10);
    if (isNaN(port)) {
      port = undefined;
    }
    const args: EmulatorSpawnArguments = new EmulatorSpawnArguments({
      program: deviceConfig.program,
      listenPort: port,
      pauseOnStart: true,
      disableStrictModuleLoad: true,
    });
    const correctedArgs = await this.correctSpawnArguments(args);
    const processArgs = this.buildProcessArguments(correctedArgs);
    this.logger.info(
      `starting emulator process with arguments ${processArgs.join(' ')}`,
    );
    const spawnCommand = getPath2WARDuinoSDKEmulatorBinary();
    if (spawnCommand === undefined) {
      throw new DeviceManagerError(
        "Path to WARDuino SDK is not set. You can set it via env variable 'WARDUINO_SDK=PATH'",
      );
    }

    this.logger.debug(
      'decide whether to move callbacks on data or on close to the EmulateDevice class',
    );

    const childProcess = spawn(spawnCommand, processArgs);
    childProcess.stdout.on('data', (data) => {
      this.logger.debug(`${deviceConfig.name} (Spawned process): ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
      this.logger.error(`${deviceConfig.name} (Spawned process): ${data}`);
    });

    childProcess.on('close', (code) => {
      this.logger.info(`Spawned process exit with code ${code}`);
      this.logger.debug('Removing process from local list');
      this.localprocesses = this.localprocesses.filter(
        (e: EmulatedWARDuinoVM) => {
          return !e.isProcess(childProcess);
        },
      );
    });

    const emulatedDevice = new EmulatedWARDuinoVM(
      args.listenPort as number,
      deviceConfig,
      correctedArgs,
      childProcess,
      buildOutputDir,
    );
    const connected = await emulatedDevice.connect(maxWaitTime);
    if (!connected) {
      this.logger.info(
        `Failed to connect to local emulator process at port ${correctedArgs.listenPort}`,
      );
      this.logger.info('Killing local emulator process');
      childProcess.kill();
      throw new DeviceManagerError('timed out connecting to emulator process');
    }
    this.localprocesses.push(emulatedDevice);
    return emulatedDevice;
  }

  async closeEmulatorVM(vm: EmulatedWARDuinoVM): Promise<boolean> {
    return await vm.close();
  }

  async spawnHardwareVM(
    platformConfig: PlatformBuilderConfig,
    buildOutputDir?: string,
  ): Promise<MCUWARDuinoVM> {
    let channel: Channel | undefined;
    if (platformConfig.configuredForSerial()) {
      channel = new SerialConnection(
        platformConfig.deviceConfig.port,
        platformConfig.baudrate,
      );
    } else if (platformConfig.configuredForNetwork()) {
      const port = parseInt(platformConfig.deviceConfig.port);
      if (isNaN(port)) {
        throw new DeviceManagerError(
          `Port is expected to be a number. Given ${port}`,
        );
      }
      channel = new ClientSideSocket(port, platformConfig.deviceConfig.host);
    } else {
      throw new DeviceManagerError(
        `DeviceConfiguration has not been configured to serial or network`,
      );
    }
    return new MCUWARDuinoVM(platformConfig, channel, buildOutputDir);
  }
}
