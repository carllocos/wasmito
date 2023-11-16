import { readFileAsBuffer } from '../../util/file_util';
import { type PlatformBuilderConfig } from '../platform_config';
import { PlatformBuilder } from '../platformbuilder';

export class EmulatorPlatform extends PlatformBuilder {
  private pathToSrcDir: string;

  constructor(config: PlatformBuilderConfig, outputDir: string = '') {
    super(config, outputDir);
    this.pathToSrcDir = ''; // path to uncompiled source code
  }

  getWasmPath(): string {
    return this.pathToSrcDir; // depends on where he compilere will write this
  }

  async getWasm(): Promise<Buffer> {
    const pathToWasm = this.getWasmPath();
    return await readFileAsBuffer(pathToWasm);
  }

  async compile(sourceFile: string): Promise<number> {
    this.pathToSrcDir = sourceFile; // for now path to wasm
    return 0;
  }

  async upload(): Promise<number> {
    return 0;
  }
}
