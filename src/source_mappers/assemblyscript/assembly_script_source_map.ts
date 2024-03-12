import fs from 'fs';
import { type MappingItem } from 'source-map';
import { type ASConfig } from '../compilers/assemblyscript_compiler';
import { type VariableInfo } from '../parsers/obj-dump_parser';
import {
  type SourceCodeMapping,
  SourceMap,
  type WASMFunction,
} from '../source_map';
import { type WasmOpcode } from '../wat/opcodes';

// import * as TreeSitter from 'tree-sitter';
// import * as TypeScript from 'tree-sitter-typescript';
import Parser = require('tree-sitter');
import { isAbsolutePath } from '../../util/file_util';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const typescript = require('tree-sitter-typescript');

export type ASMapping = MappingItem;

export class AssemblyScriptSourceMap extends SourceMap {
  private readonly _asConfig: ASConfig;
  private readonly _mappings: ASMapping[];
  private readonly _sourceMappings: SourceCodeMapping[];
  private readonly _sources: string[];
  private readonly _sourceTreeMap: Map<string, Parser.Tree>;

  constructor(asConfig: ASConfig, sources: string[], mappings: ASMapping[]) {
    super(asConfig.configPath, asConfig.wasmPath);
    this._asConfig = asConfig;
    this._sources = sources.map((s) => {
      if (!isAbsolutePath(s)) {
        throw new Error(`source '${s}' is expected to be an absolute path`);
      }
      return s;
    });
    this._mappings = mappings;
    this._sourceMappings = [];
    this._sourceTreeMap = new Map();
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
    parser.setLanguage(typescript.typescript);
    for (let i = 0; i < this._sources.length; i++) {
      const source = this._sources[i];
      const content = await fs.promises.readFile(source);
      const sourceCode = content.toString();
      const tree = parser.parse(sourceCode);
      this._sourceTreeMap.set(source, tree);
    }
  }
}
