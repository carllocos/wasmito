import { type ChildProcess } from 'child_process';
import { type EmulatorSpawnArguments } from './emulator_config';
import { ClientSideSocket } from '../communication/client_socket';
import { type WARDuinoAPI } from '../warduino/api/warduino_api';
import { Command } from '../communication/command';
import { RunRequest } from '../warduino/requests/run_request';
import { type DeviceConfig } from './device_config';
import type winston from 'winston';
import { createLogger } from '../logger/logger';
import { type APIRequest } from '../warduino/api/request_interface';
import { StepRequest } from '../warduino/requests/step_request';

export class EmulateDevice implements WARDuinoAPI {
  private readonly process?: ChildProcess;
  private readonly args: EmulatorSpawnArguments;
  private readonly deviceConfig: DeviceConfig;
  private readonly channel: ClientSideSocket;
  private readonly logger: winston.Logger;

  constructor(
    deviceConfig: DeviceConfig,
    args: EmulatorSpawnArguments,
    process?: ChildProcess,
  ) {
    this.args = args;
    this.process = process;
    this.deviceConfig = deviceConfig;
    this.logger = createLogger(deviceConfig.name);
    if (args.listenPort === undefined) {
      throw new EmulateDeviceError('debugger listen port not provided');
    } else {
      this.channel = new ClientSideSocket(
        this.args.listenPort as number,
        'localhost',
      );
    }
  }

  public isProcess(p: ChildProcess): boolean {
    return this.process === p;
  }

  public async addBreakpoint(wasmaddress: number): Promise<boolean> {
    this.logger.error('TODO addBreakpoint to implement');
    return false;
  }

  public async run(timeout?: number): Promise<boolean> {
    const request = new RunRequest();
    const cmd = new Command<string>(this.channel, request, timeout);
    this.logger.debug(
      `Sending RunRequest (payload=${request.getData()}) to emulator process`,
    );
    const ack = await this.sendCommand(cmd);
    this.logger.debug(`Received RunRequest reply=${ack}`);
    return true;
  }

  public async step(timeout?: number): Promise<void> {
    const request = new StepRequest();
    const cmd = new Command<string>(this.channel, request, timeout);
    this.logger.debug(
      `Sending StepRequest (payload=${request.getData()}) to emulator process`,
    );
    const ack = await this.sendCommand(cmd);
    this.logger.debug(`Received RunRequest reply=${ack}`);
  }

  public async connectToProcess(timeout: number): Promise<boolean> {
    return await this.channel.open(timeout);
  }

  public async sendRequest<T>(
    request: APIRequest<T>,
    timeout?: number,
  ): Promise<T> {
    const command = new Command(this.channel, request, timeout);
    return await command.execute();
  }

  public async sendCommand<T>(command: Command<T>): Promise<T> {
    return await command.execute();
  }
}

export class EmulateDeviceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmulateDeviceError';
    Error.captureStackTrace(this, EmulateDeviceError);
  }
}
