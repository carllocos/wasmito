import { type Logger } from 'winston';
import { type PlatformBuilderConfig } from '../../builder/platform_config';
import { WARDuinoVM } from './warduino_vm';
import { type Channel } from '../../communication/channel_interface';
import { createLogger } from '../../logger/logger';

export class MCUWARDuinoVM extends WARDuinoVM {
  protected logger: Logger;

  constructor(
    platformConfig: PlatformBuilderConfig,
    channel: Channel,
    buildOutputDir?: string,
  ) {
    super(platformConfig, channel, buildOutputDir);
    this.logger = createLogger(
      `MCUWARDuino ${platformConfig.deviceConfig.name} (${platformConfig.fqbn.boardName})`,
    );
  }

  async close(): Promise<boolean> {
    this.logger.info('closing VM');
    const closedChannel = await this.channel.close();
    this.logger.debug(
      closedChannel
        ? 'VM channel successfully closed'
        : 'VM channel could not be closed',
    );
    return closedChannel;
  }
}
