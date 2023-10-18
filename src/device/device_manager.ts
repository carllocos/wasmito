import { EmulatorSpawnArguments } from './emulator_config';
import type winston from 'winston';
import { getFreePort, isPortInUse } from '../util/socket_util';
import { spawn } from 'child_process';
import { createLogger } from '../logger/logger';
import { EmulateDevice } from './device_emulated';
import { type DeviceConfig } from './device_config';
import { getPath2WARDuinoSDKEmulatorBinary } from '../project_config';

export class SpawnEmulatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpawnEmulatorError';
    Error.captureStackTrace(this, SpawnEmulatorError);
  }
}

export class DeviceManager {
  logger: winston.Logger;
  localprocesses: EmulateDevice[];

  constructor() {
    this.logger = createLogger('DeviceManager');
    this.localprocesses = [];
  }

  async correctSpawnArguments(
    args: EmulatorSpawnArguments,
  ): Promise<EmulatorSpawnArguments> {
    if (args.listenPort !== undefined) {
      if (await isPortInUse(args.listenPort)) {
        throw new SpawnEmulatorError(`Port ${args.listenPort} already in use`);
      }
    } else {
      const openPort = await getFreePort();
      if (openPort === undefined) {
        throw new SpawnEmulatorError('Could not find a free port');
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

  async connectToExitingEmulator(
    deviceConfig: DeviceConfig,
    maxWaitTime: number,
  ): Promise<EmulateDevice> {
    const port: number | undefined = parseInt(deviceConfig.port, 10);
    if (isNaN(port)) {
      throw new SpawnEmulatorError('port number is missing');
    }
    const args: EmulatorSpawnArguments = new EmulatorSpawnArguments({
      program: deviceConfig.program,
      listenPort: port,
      pauseOnStart: true,
    });

    const emulatedDevice = new EmulateDevice(deviceConfig, args);
    const connected = await emulatedDevice.connectToProcess(maxWaitTime);
    if (!connected) {
      this.logger.info(
        `Failed to connect to local emulator process at port ${args.listenPort}`,
      );
      throw new SpawnEmulatorError('timed out connecting to emulator process');
    }
    this.localprocesses.push(emulatedDevice);
    return emulatedDevice;
  }

  async spawnEmulator(
    deviceConfig: DeviceConfig,
    maxWaitTime: number,
  ): Promise<EmulateDevice> {
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
      throw new SpawnEmulatorError(
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
      this.localprocesses = this.localprocesses.filter((e: EmulateDevice) => {
        return !e.isProcess(childProcess);
      });
    });

    const emulatedDevice = new EmulateDevice(
      deviceConfig,
      correctedArgs,
      childProcess,
    );
    const connected = await emulatedDevice.connectToProcess(maxWaitTime);
    if (!connected) {
      this.logger.info(
        `Failed to connect to local emulator process at port ${correctedArgs.listenPort}`,
      );
      this.logger.info('Killing local emulator process');
      childProcess.kill();
      throw new SpawnEmulatorError('timed out connecting to emulator process');
    }
    this.localprocesses.push(emulatedDevice);
    return emulatedDevice;
  }
}
