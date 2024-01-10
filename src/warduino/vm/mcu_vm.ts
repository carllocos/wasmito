import { type Logger } from 'winston';
import { type PlatformBuilderConfig } from '../../builder/platform_config';
import { WARDuinoVM } from './warduino_vm';
import { type Channel } from '../../communication/channel_interface';
import { createLogger } from '../../logger/logger';
import { timeoutPromise } from '../../util/promise_util';
import { ClientSideSocket, SerialConnection } from '../../communication/index';

export class MCUWARDuinoVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCUWARDuinoVMError';
    Error.captureStackTrace(this, MCUWARDuinoVMError);
  }
}

function createChannel(platformConfig: PlatformBuilderConfig): Channel {
  if (platformConfig.configuredForSerial()) {
    return new SerialConnection(
      platformConfig.deviceConfig.vmConfig.serialPort,
      platformConfig.baudrate,
    );
  } else if (platformConfig.configuredForNetwork()) {
    return new ClientSideSocket(
      platformConfig.deviceConfig.vmConfig.toolPort,
      platformConfig.deviceConfig.vmConfig.toolHostIP,
    );
  } else {
    throw new MCUWARDuinoVMError(
      `DeviceConfiguration has not been configured to serial or network`,
    );
  }
}

export class MCUWARDuinoVM extends WARDuinoVM {
  protected logger: Logger;
  protected ErrorClass = MCUWARDuinoVMError;

  constructor(platformConfig: PlatformBuilderConfig, buildOutputDir?: string) {
    super(platformConfig, createChannel(platformConfig), buildOutputDir);
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

  async uploadSourceCode(
    sourceCodePath: string,
    timeout?: number | undefined,
  ): Promise<boolean> {
    const exitCode = await this.platform.compile(sourceCodePath);
    if (exitCode !== 0) {
      return false;
    }

    // close connection otherwise flashing cannot work
    await this.channel.close();

    let upload: Promise<number> = this.platform.upload();
    if (timeout !== undefined) {
      upload = timeoutPromise(
        upload,
        timeout,
        new MCUWARDuinoVMError('flashing to MCU timedout'),
      );
    }

    const exitCodeUpload = await upload;

    // open connection after flashing
    await this.channel.open();
    return exitCodeUpload === 0;
  }
}
