import fs from 'fs';
import { SourceMapConsumer, type MappingItem } from 'source-map';
import { isAbsolutePath, isFilePath, pathJoin } from '../../util/file_util';
import { createLogger } from '../../logger/logger';
import { type ASConfig } from './asconfig';
import { getPath2AssemblyScriptLib } from '../../project_config';
import { SourceMap } from '../source_map';

export type ASMapping = MappingItem;

const logger = createLogger('AssemblyScriptSourceMap');

export async function SourceMapFromASConfigPath(
  config: ASConfig,
): Promise<SourceMap> {
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

  const sourceAbsPath: string[] = [];
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

  const sm = new SourceMap(
    'typescript',
    config.sourceMappersPath,
    config.wasmPath,
    sourceAbsPath,
    sources,
    cleanedMappings,
  );
  return sm;
}

function isLibDependency(source: string): boolean {
  const libPrefix = '~lib/';
  return source.startsWith(libPrefix);
}

function gerenateAssemblyScriptCommonPath(src: string): string {
  const libPrefix = '~lib/';
  const s = src.replace(libPrefix, '');
  const p = getPath2AssemblyScriptLib();
  const path2Source = pathJoin(p, `/std/assembly/${s}`);
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
