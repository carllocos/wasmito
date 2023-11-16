import { readFileAsBuffer } from '../../util/file_util';
import { type PlatformBuilderConfig } from '../platform_config';
import { PlatformBuilder } from '../platformbuilder';

export class EmulatorPlatform extends PlatformBuilder {
  private readonly pathToSrcDir: string;

  constructor(config: PlatformBuilderConfig, outputDir: string = '') {
    super(config, outputDir);
    this.pathToSrcDir = ''; // path to uncompiled source code
  }

  getWasmPath(): string {
    return `${this.outputDirectory}bin/upload.wasm`;
  }

  async getWasm(): Promise<Buffer> {
    const pathToWasm = this.getWasmPath();
    return await readFileAsBuffer(pathToWasm);
  }

  async compile(sourceFile: string): Promise<number> {
    return 0;
  }

  async upload(): Promise<number> {
    return 0;
  }
}
