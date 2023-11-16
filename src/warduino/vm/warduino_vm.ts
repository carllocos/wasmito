import type winston from 'winston';
import { type Channel } from '../../communication/channel_interface';
import { type WARDuinoAPI } from '../api/warduino_api';
import { RunRequest } from '../requests/run_request';
import { StepRequest } from '../requests/step_request';
import { type APIRequest } from '../api/request_interface';
import { Command } from '../../communication/command';
import { type PlatformBuilderConfig } from '../../builder/platform_config';
import { type PlatformBuilder } from '../../builder/platformbuilder';
import { createPlatformBuilder } from '../../builder/platformbuilder_factory';

export abstract class WARDuinoVM implements WARDuinoAPI {
  protected readonly channel: Channel;
  protected abstract logger: winston.Logger;
  protected readonly platformConfig: PlatformBuilderConfig;
  protected readonly platform: PlatformBuilder;

  constructor(
    platformConfig: PlatformBuilderConfig,
    channel: Channel,
    buildOutputDir?: string,
  ) {
    this.platformConfig = platformConfig;
    this.channel = channel;
    this.platform = createPlatformBuilder(platformConfig, buildOutputDir);
  }

  abstract close(): Promise<boolean>;

  async connect(timeout?: number): Promise<boolean> {
    const opened = await this.channel.open(timeout);
    this.logger.info(opened ? 'Channel opened' : 'Channel failed to open');
    return opened;
  }

  public async disconnect(): Promise<boolean> {
    const closed = await this.channel.close();
    this.logger.info(closed ? 'Channel closed' : 'Channel failed to close');
    return closed;
  }

  public async run(timeout?: number): Promise<boolean> {
    const request = new RunRequest();
    this.logger.debug('Sending RunRequest');
    await this.sendRequest(request, timeout);
    this.logger.info('Running');
    return true;
  }

  public async step(timeout?: number): Promise<void> {
    const request = new StepRequest();
    this.logger.debug('Sending StepRequest');
    await this.sendRequest(request, timeout);
    this.logger.info('Stepped');
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

  public async proxify(timeout?: number): Promise<void> {
    const request = new ProxifyRequest();
    this.logger.debug('Sending ProxifyRequest');
    await this.sendRequest(request, timeout);
    this.logger.info('VM in proxy mode');
  }
}
