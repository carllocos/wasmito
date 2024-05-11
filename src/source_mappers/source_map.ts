import fs from 'fs';
import { SourceMapConsumer, type MappingItem } from 'source-map';
import { type SourceCodeLocation } from './old_source_map';
import { createLogger } from '../logger/logger';
import { isAbsolutePath, isFilePath, pathJoin } from '../util/file_util';

const logger = createLogger('SourceMap');

export class SourceMap {
  private readonly _sourceToAbsPathSource: Map<string, string>;
  private readonly _mappings: MappingItem[];
  private readonly _pathToSourceMap: string;
  private readonly _wasmPath: string;

  constructor(
    pathToSourceMap: string,
    wasmPath: string,
    absolutePathSources: string[],
    sources: string[],
    mappings: MappingItem[],
  ) {
    this._wasmPath = wasmPath;
    this._pathToSourceMap = pathToSourceMap;
    this._sourceToAbsPathSource = new Map();
    this._mappings = mappings;

    if (sources.length !== absolutePathSources.length) {
      throw new Error(
        `Sources size #${sources.length} !== absolutePath Sources size #${absolutePathSources.length} `,
      );
    }

    for (let i = 0; i < sources.length; i++) {
      this._sourceToAbsPathSource.set(sources[i], absolutePathSources[i]);
    }
  }

  public generatedPositionFor(location: SourceCodeLocation): MappingItem[] {
    const positions: MappingItem[] = [];
    const candidates = this._mappings.filter((m) => {
      return m.originalLine === location.linenr;
    });

    for (const s of candidates) {
      const colStart = location.columnStart;
      if (colStart !== undefined) {
        if (colStart > s.originalColumn) {
          continue;
        }
      }

      const colEnd = location.columnEnd;
      if (colEnd !== undefined) {
        logger.warn(
          `Ignoring columEnd ${colEnd} as sourceMap has only column field`,
        );
      }

      positions.push(s);
    }
    return positions;
  }

  public getOriginalPositionFor(wasmAddr: number): MappingItem | undefined {
    const maps = this._mappings
      .filter((m: MappingItem) => {
        return m.generatedColumn === wasmAddr;
      })
      .map((m: MappingItem) => {
        const src = this._sourceToAbsPathSource.get(m.source);
        if (src === undefined) {
          throw new Error(`No absolutePath set for Source ${m.source}`);
        }
        m.source = src;
        return m;
      });

    if (maps.length > 1) {
      throw new Error(
        `More than one possible mapping found #${maps.length} mappings`,
      );
    } else if (maps.length === 0) {
      return undefined;
    } else {
      return maps[0];
    }
  }

  static async fromSourceMapPath(
    pathToRootSource: string,
    pathToSourceMap: string,
    wasmPath: string,
    savePath: string = '',
  ): Promise<SourceMap> {
    const content = await fs.promises.readFile(pathToSourceMap);
    const sourceMapStr = JSON.parse(content.toString());
    const [sources, mappings, srcRoot] = await SourceMapConsumer.with(
      sourceMapStr,
      null,
      (consumer) => {
        const mps: MappingItem[] = [];
        consumer.eachMapping((mapping: MappingItem) => {
          mps.push(mapping);
        });
        const c = consumer as any; // TODO sourceRoot update types info
        const sourceRoot = c.sourceRoot;
        return [consumer.sources, mps, sourceRoot];
      },
    );

    if (savePath !== '') {
      const o = {
        sources,
        mappings,
      };
      const jsonString = JSON.stringify(o);
      fs.writeFileSync(savePath, jsonString);
    }

    const sourceRoot = typeof srcRoot === 'string' ? srcRoot : pathToRootSource;

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

    const sourcesAbsPath: string[] = [];
    for (let i = 0; i < sources.length; i++) {
      let source = sources[i];
      if (source.startsWith(sourceRoot)) {
        logger.debug(
          `Removing sourceRoot '${sourceRoot}' from AssemblyScript source '${source}'`,
        );
        source = source.slice(sourceRoot.length + 1, source.length);
      }

      if (!isAbsolutePath(source)) {
        logger.debug(`Creating absolute path for source '${source}`);
        source = pathJoin(sourceRoot, source);
      }
      if (isFilePath(source)) {
        sourcesAbsPath.push(source);
      } else {
        logger.warn(
          `Ignoring source '${source}' for source maps as such file does not exist`,
        );
      }
    }

    if (sourcesAbsPath.length === 0) {
      throw new Error(
        `No source found in the sourcemap that satifies the conditions. All sources  ${sources.join(
          ', ',
        )}`,
      );
    }

    const sm = new SourceMap(
      pathToSourceMap,
      wasmPath,
      sourcesAbsPath,
      sources,
      cleanedMappings,
    );
    return sm;
  }
}
