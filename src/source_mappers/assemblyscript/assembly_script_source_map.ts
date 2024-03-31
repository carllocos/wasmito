import fs from 'fs';
import { SourceMapConsumer, type MappingItem } from 'source-map';
import {
  type SourceCodeMapping,
  SourceMap,
  type SourceCodeLocation,
} from '../source_map';
import { isAbsolutePath, isFilePath, pathJoin } from '../../util/file_util';
// import * as TreeSitter from 'tree-sitter';
// import * as TypeScript from 'tree-sitter-typescript';
import Parser = require('tree-sitter');
import { createLogger } from '../../logger/logger';
import { type ASConfig } from './asconfig';
import { getPath2AssemblyScriptLib } from '../../project_config';
import path = require('path');
import { type WASMFunction } from '../wasm/wasm_function';
import { type WasmInstruction } from '../wasm/wasm_instruction';

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
    let m = this._mappings.find((m: MappingItem) => {
      return m.generatedColumn === wasmAddr;
    });

    let instruction: WasmInstruction | undefined;
    if (m === undefined) {
      instruction = this.wasm.instructionFromAddress(wasmAddr);
      if (instruction === undefined) {
        return undefined;
      }
      m = this._mappings.find((mi: MappingItem) => {
        return mi.generatedColumn === instruction?.startAddress;
      });
    }
    if (m?.source === undefined || m?.source === null) {
      return undefined;
    }
    const src = this._sourceToAbsPathSource.get(m.source);
    if (src === undefined) {
      throw new Error(`No absolutePath set for Source ${m.source}`);
    }
    instruction = this.wasm.instructionFromAddress(wasmAddr);
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

    const cleanedMappings = mappings.filter((m: MappingItem) => {
      const hasOriginalLine =
        m.originalLine !== undefined && m.originalLine !== null;
      const hasOriginalColumnNr =
        m.originalColumn !== undefined && m.originalColumn !== null;
      return hasOriginalLine && hasOriginalColumnNr;
    });
    if (mappings.length !== cleanedMappings.length) {
      logger.debug(
        `We removed ${mappings.length - cleanedMappings.length} entries from the sourcemap as it has no originalLineNr nor originalColumnNr`,
      );
    }

    cleanedMappings.forEach((m: MappingItem) => {
      // case where either source, line number, column nr, is not avaialable should not occur
      // throw error just in case
      if (m.originalLine === undefined || m.originalColumn === undefined) {
        throw new Error(`Found an empty originalLine nr for mapping`);
      }

      if (m.originalColumn === undefined || m.originalColumn === undefined) {
        throw new Error(`Found an empty originalColumn nr for mapping`);
      }

      if (m.source === undefined || m.source === undefined) {
        throw new Error(`Found an empty source for mapping`);
      }
    });

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
        // The order of the two following checks is crucial
        if (isLibDependency(source)) {
          if (isWARDuinoGlueCode(source)) {
            source = gerenateWARDuinoASPath(config.srcRootPath);
          } else if (isAssemblyScriptLib(source)) {
            source = gerenateAssemblyScriptCommonPath(source);
          } else {
            logger.error(`encountered a path to an unknown lib '${source}'`);
            throw new Error(`encountered a path to an unknown lib '${source}'`);
          }
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
      cleanedMappings,
    );
    await sm.buildComplemtaryContext();
    return sm;
  }
}

function isLibDependency(source: string): boolean {
  const libPrefix = '~lib/';
  return source.startsWith(libPrefix);
}

function gerenateAssemblyScriptCommonPath(src: string): string {
  const libPrefix = '~lib/';
  const s = src.replace(libPrefix, '');
  const p = getPath2AssemblyScriptLib();
  const path2Source = path.join(p, `/std/assembly/${s}`);
  if (!isFilePath(path2Source)) {
    throw new Error(`the generated AS common.ts does not exist ${path2Source}`);
  }
  return path2Source;
}

function isAssemblyScriptLib(source: string): boolean {
  const assemblyScriptLibCommon = '~lib/';
  return source.startsWith(assemblyScriptLibCommon);
}

function isWARDuinoGlueCode(source: string): boolean {
  const glueCodePath = '~lib/as-warduino/';
  return source.startsWith(glueCodePath);
}

function gerenateWARDuinoASPath(pathToSrcRoot: string): string {
  const glueCodePath = pathJoin(
    pathToSrcRoot,
    'node_modules/as-warduino/assembly/index.ts',
  );
  return glueCodePath;
}
