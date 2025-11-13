import { type PlatformConfig } from './platform_config';
import { Platform } from './platform';

export class DevVMPlatform extends Platform {
  constructor(config: PlatformConfig, outputDir: string = '') {
    super(config, outputDir);
  }

  async buildForPlatform(
    _wasmPath: string,
    _maxWaitTime?: number,
  ): Promise<number> {
    return 0;
  }

  async upload(): Promise<number> {
    return 0;
  }

  async getUploadedWasm(): Promise<string | undefined> {
    return undefined;
  }
}
