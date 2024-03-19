import fs from 'fs';
import { type MappingItem, SourceMapConsumer } from 'source-map';
import { type VariableInfo } from '../parsers/obj-dump_parser';
import {
  type SourceCodeMapping,
  SourceMap,
  type WASMFunction,
} from '../source_map';
import { type WasmOpcode } from '../wat/opcodes';
import { isAbsolutePath, isFilePath, pathJoin } from '../../util/file_util';
// import * as TreeSitter from 'tree-sitter';
// import * as TypeScript from 'tree-sitter-typescript';
import Parser = require('tree-sitter');
import { createLogger } from '../../logger/logger';
import { type ASConfig } from './asconfig';
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const typescript = require('tree-sitter-typescript');

export type ASMapping = MappingItem;

const logger = createLogger('AssemblyScriptSourceMap');

export class AssemblyScriptSourceMap extends SourceMap {
  private readonly _asConfig: ASConfig;
  private readonly _mappings: ASMapping[];
  private readonly _sourceMappings: SourceCodeMapping[];
  private readonly _sourceTreeMap: Map<string, Parser.Tree>;

  constructor(asConfig: ASConfig, sources: string[], mappings: ASMapping[]) {
    super(sources, asConfig.wasmPath);
    this._asConfig = asConfig;
    this._mappings = mappings;
    this._sourceMappings = [];
    this._sourceTreeMap = new Map();
  }

  public getSources(): string[] {
    // TODO fix
    return [this.sourceCodeFilePath];
  }

  public getFunction(id: number): WASMFunction | undefined {
    throw new Error('Method not implemented.');
  }

  public mappings(): SourceCodeMapping[] {
    return this._sourceMappings;
  }

  public getPrevSourceCodeMappingFromAddress(
    wasmAddr: number,
  ): SourceCodeMapping | undefined {
    throw new Error('Method not implemented.');
  }

  public getOpcode(address: number): WasmOpcode | undefined {
    throw new Error('Method not implemented.');
  }

  public getGlobalFromIndex(index: number): VariableInfo | undefined {
    throw new Error('Method not implemented.');
  }

  public getEnvironmentFunctions(): WASMFunction[] {
    throw new Error('Method not implemented.');
  }

  async createAST(): Promise<void> {
    const parser = new Parser();
    // parser.setLanguage(typescript);
    for (let i = 0; i < this.sources.length; i++) {
      const source = this.sources[i];
      const content = await fs.promises.readFile(source);
      const sourceCode = content.toString();
      const tree = parser.parse(sourceCode);
      this._sourceTreeMap.set(source, tree);
    }
  }

  static async fromSourceMapPath(
    config: ASConfig,
  ): Promise<AssemblyScriptSourceMap> {
    const content = await fs.promises.readFile(config.sourceMappersPath);
    const sourceMapStr = JSON.parse(content.toString());
    const [sources, mappings] = await SourceMapConsumer.with(
      sourceMapStr,
      null,
      (consumer) => {
        const mps: MappingItem[] = [];
        consumer.eachMapping((mapping: MappingItem) => {
          mps.push(mapping);
        });
        return [consumer.sources, mps];
      },
    );

    const sourceAbsPath = [];
    for (let i = 0; i < sources.length; i++) {
      let source = sources[i];
      if (source.startsWith(`${config.prefixFileName}/`)) {
        logger.debug(`Removing prefix from AssemblyScript source '${source}'`);
        source = source.slice(config.prefixFileName.length + 1, source.length);
      }

      if (!isAbsolutePath(source)) {
        logger.debug(`Creating absolute path for source '${source}`);
        source = pathJoin(config.srcRootPath, source);
      }
      if (isFilePath(source)) {
        sourceAbsPath.push(source);
      } else {
        logger.debug(
          `Ignoring source '${source}' for source maps as such file does not exist`,
        );
      }
    }

    if (sourceAbsPath.length === 0) {
      throw new Error(
        `No source found in the sourcemap that satifies the conditions. All sources  ${sources.join(
          ', ',
        )}`,
      );
    }

    const sm = new AssemblyScriptSourceMap(config, sourceAbsPath, mappings);
    await sm.createAST();
    return sm;
  }
}
