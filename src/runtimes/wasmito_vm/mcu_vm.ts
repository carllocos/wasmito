import { WasmitoBackendVM } from './wasmito_vm';
import { type Channel } from '../../communication/channel_interface';
import { createLogger, Logger } from '../../logger/logger';
import { timeoutPromise } from '../../util/promise_util';
import { ClientSideSocket } from '../../communication/client_socket';
import { SerialConnection } from '../../communication/serial';
import { type PlatformConfig } from '../../platforms/platform_config';
import { type Platform } from '../../platforms/platform';
import { NoChannel } from '../../communication/no_channel';
import { LanguageAdaptor } from '../../language_adaptors';

export class MCUWasmitoVMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MCUWasmitoVMError';
    Error.captureStackTrace(this, MCUWasmitoVMError);
  }
}

function createChannel(platformConfig: PlatformConfig): Channel {
  if (platformConfig.configuredForSerial()) {
    return new SerialConnection(
      platformConfig.vmConfig.serialPort,
      platformConfig.vmConfig.baudrate,
      platformConfig.deviceIdentity.fullname,
    );
  } else if (platformConfig.configuredForNetwork()) {
    return new ClientSideSocket(
      platformConfig.vmConfig.toolPort,
      platformConfig.vmConfig.toolHostIP,
      platformConfig.deviceIdentity.fullname,
    );
  } else {
    throw new MCUWasmitoVMError(
      `DeviceConfiguration has not been configured to serial or network`,
    );
  }
}

export class MCUWasmitoVM extends WasmitoBackendVM {
  protected logger: Logger;
  protected ErrorClass = MCUWasmitoVMError;

  constructor(platform: Platform, channel?: Channel) {
    super(platform, channel ?? new NoChannel());
    this.logger = createLogger(
      `MCUWasmito ${platform.config.deviceIdentity.fullname}`,
    );

    if (channel === undefined) {
      this.channel = createChannel(this.platform.config);
    }
  }

  async close(timedout?: number): Promise<boolean> {
    this.logger.info('closing VM');
    const closedChannel = await this.channel.close(timedout);
    this.logger.debug(
      closedChannel
        ? 'VM channel successfully closed'
        : 'VM channel could not be closed',
    );
    return closedChannel;
  }

  async uploadSourceCode(
    languageAdaptor: LanguageAdaptor,
    timeout?: number | undefined,
  ): Promise<boolean> {
    const exitCode = await this.platform.buildForPlatform(
      languageAdaptor.sourceMap.wasm.wasmPath,
    );
    if (exitCode !== 0) {
      return false;
    }

    // close connection otherwise flashing cannot work
    await this.channel.close(timeout);

    let upload: Promise<number> = this.platform.upload();
    if (timeout !== undefined) {
      upload = timeoutPromise(
        upload,
        timeout,
        new MCUWasmitoVMError('flashing to MCU timedout'),
      );
    }

    const exitCodeUpload = await upload;
    if (exitCodeUpload !== 0) {
      return false;
    }
    this.languageAdaptor = languageAdaptor;

    // open connection after flashing
    return await this.channel.open();
  }
}
