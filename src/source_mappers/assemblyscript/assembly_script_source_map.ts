import fs from 'fs';
import { SourceMapConsumer, type MappingItem } from 'source-map';
import {
  type SourceCodeMapping,
  SourceMap,
  type SourceCodeLocation,
} from '../source_map';
import { WASMOpcodeNumber, WasmInstruction } from '../wasm/wasm_instruction';
import { isAbsolutePath, isFilePath, pathJoin } from '../../util/file_util';
// import * as TreeSitter from 'tree-sitter';
// import * as TypeScript from 'tree-sitter-typescript';
import Parser = require('tree-sitter');
import { createLogger } from '../../logger/logger';
import { type ASConfig } from './asconfig';
import { getPath2AssemblyScriptLib } from '../../project_config';
import path = require('path');
import { type WASMFunction } from '../wasm/wasm_function';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const typescript = require('tree-sitter-typescript');

export type ASMapping = MappingItem;

const logger = createLogger('AssemblyScriptSourceMap');

export class AssemblyScriptSourceMap extends SourceMap {
  private readonly _asConfig: ASConfig;
  private readonly _mappings: ASMapping[];
  private readonly _sourceMappings: SourceCodeMapping[];
  private readonly _sourceTreeMap: Map<string, Parser.Tree>;
  private readonly _sourceToAbsPathSource: Map<string, string>;

  constructor(
    asConfig: ASConfig,
    absolutePathSources: string[],
    sources: string[],
    mappings: ASMapping[],
  ) {
    super(absolutePathSources, asConfig.wasmPath);
    if (absolutePathSources.length !== sources.length) {
      throw new Error(
        `Both absolutePathSources and sources should have the same length. Given ${absolutePathSources} and ${sources}`,
      );
    }
    this._asConfig = asConfig;
    this._mappings = mappings;
    this._sourceMappings = [];
    this._sourceTreeMap = new Map();
    this._sourceToAbsPathSource = new Map();
    for (let i = 0; i < sources.length; i++) {
      this._sourceToAbsPathSource.set(sources[i], absolutePathSources[i]);
    }
  }

  public generatedPositionFor(
    location: SourceCodeLocation,
  ): SourceCodeMapping[] {
    throw new Error('Method not implemented.');
  }

  public override getOriginalPositionFor(
    wasmAddr: number,
  ): SourceCodeMapping | undefined {
    const m = this._mappings.find((m: MappingItem) => {
      return m.generatedColumn === wasmAddr;
    });
    if (m?.source === undefined || m?.source === null) {
      return undefined;
    }
    const src = this._sourceToAbsPathSource.get(m.source);
    if (src === undefined) {
      throw new Error(`No absolutePath set for Source ${m.source}`);
    }
    const instruction = this.wasm.instructionFromAddress(wasmAddr);
    if (instruction === undefined) {
      return undefined;
    }
    return {
      source: src,
      address: m.generatedColumn,
      linenr: m.originalLine,
      columnStart: m.originalColumn,
      columnEnd: m.originalColumn,
      instruction,
    };
  }

  public getFunction(id: number): WASMFunction | undefined {
    if (id >= this.wasm.imports.length) {
      return this.wasm.functions.find((f) => {
        return f.id === id;
      });
    } else {
      return this.wasm.imports.find((f) => {
        return f.id === id;
      });
    }
  }

  async buildComplemtaryContext(): Promise<void> {
    await this.createAST();
  }

  private async createAST(): Promise<void> {
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
    const [sources, mappings, sourceRoot] = await SourceMapConsumer.with(
      sourceMapStr,
      null,
      (consumer) => {
        const mps: MappingItem[] = [];
        consumer.eachMapping((mapping: MappingItem) => {
          mps.push(mapping);
        });
        const c = consumer as any; // TODO sourceRoot update types info
        const sourceRoot = c.sourceRoot as string;
        return [consumer.sources, mps, sourceRoot];
      },
    );

    const sourceAbsPath = [];
    for (let i = 0; i < sources.length; i++) {
      let source = sources[i];
      if (source.startsWith(sourceRoot)) {
        logger.debug(
          `Removing sourceRoot '${sourceRoot}' from AssemblyScript source '${source}'`,
        );
        source = source.slice(sourceRoot.length + 1, source.length);
      }

      if (!isAbsolutePath(source)) {
        if (isAssemblyScriptCommonLib(source)) {
          source = gerenateAssemblyScriptCommonPath();
        } else if (isWARDuinoGlueCode(source)) {
          source = gerenateWARDuinoASPath(config.srcRootPath);
        } else {
          logger.debug(`Creating absolute path for source '${source}`);
          source = pathJoin(config.srcRootPath, source);
        }
      }
      if (isFilePath(source)) {
        sourceAbsPath.push(source);
      } else {
        logger.warn(
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

    const sm = new AssemblyScriptSourceMap(
      config,
      sourceAbsPath,
      sources,
      mappings,
    );
    await sm.buildComplemtaryContext();
    return sm;
  }
}

function gerenateAssemblyScriptCommonPath(): string {
  const p = getPath2AssemblyScriptLib();
  const path2Source = path.join(p, '/std/assembly/rt/common.ts');
  if (!isFilePath(path2Source)) {
    throw new Error(`the generated AS common.ts does not exist ${path2Source}`);
  }
  return path2Source;
}

function isAssemblyScriptCommonLib(source: string): boolean {
  const assemblyScriptLibCommon = '~lib/rt/common.ts';
  return source === assemblyScriptLibCommon;
}

function isWARDuinoGlueCode(source: string): boolean {
  const glueCodePath = '~lib/as-warduino/assembly/index.ts';
  return source === glueCodePath;
}

function gerenateWARDuinoASPath(pathToSrcRoot: string): string {
  const glueCodePath = pathJoin(
    pathToSrcRoot,
    'node_modules/as-warduino/assembly/index.ts',
  );
  return glueCodePath;
}
