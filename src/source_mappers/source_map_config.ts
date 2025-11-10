import { createLogger } from '../logger/logger';
import { readFileAsJSON } from '../util/file_util';

const logger = createLogger('SourceMapConfig');
export const DefaultColumnOffset = 0;
export const DefaultLineOffset = 0;

export interface SourceMapConfig {
  srcToAbsPath?: Map<string, string>;
  ignore?: string[];
  prefixSources?: string;
  removeUnusedMappings?: boolean;
  columnOffset?: number;
  lineOffset?: number;
  newWasmPath?: string;
  keepAllMappings?: boolean;
  relativePaths?: boolean;
}

export async function readSourceMapConfig(
  jsonPath: string,
): Promise<SourceMapConfig> {
  const rebase = await readFileAsJSON(jsonPath);

  const config: SourceMapConfig = {};
  config.srcToAbsPath = new Map<string, string>();
  const pathsAr = rebase.absolutePaths ?? [];
  if (Array.isArray(pathsAr)) {
    for (let i = 0; i < pathsAr.length; i++) {
      const pathMap = pathsAr[i];
      if (!Array.isArray(pathMap) || pathMap.length !== 2) {
        const msg = 'SourceMapConfig: A filepath map requires 2 values';
        logger.error(msg);
        throw new Error(msg);
      } else {
        const [p1, p2] = pathMap;
        if (typeof p1 !== 'string' || typeof p2 !== 'string') {
          const msg = 'SourceMapConfig: Filepaths are supposed to be strings';
          logger.error(msg);
          throw new Error(msg);
        }
        config.srcToAbsPath.set(p1, p2);
      }
    }
  }

  if (rebase.prefixSources !== undefined) {
    const prefixSources = rebase.prefixSources;
    if (typeof prefixSources !== 'string') {
      const msg = 'SourceMapConfig: `prefixSources` is expected to be a string';
      logger.error(msg);
      throw new Error(msg);
    }
    config.prefixSources = prefixSources;
  }

  if (Array.isArray(rebase.ignore)) {
    const ignore = [];
    for (const ignoreDirOrFile of rebase.ignore) {
      if (typeof ignoreDirOrFile !== 'string') {
        const msg =
          'SourceMapConfig: Ignore Directory or source file is expected to be a string';
        logger.error(msg);
        throw new Error(msg);
      }
      ignore.push(ignoreDirOrFile);
    }
    config.ignore = ignore;
  }

  if (rebase.lineOffset !== undefined) {
    config.lineOffset = Number(rebase.lineOffset);
    if (isNaN(config.lineOffset)) {
      const msg = 'SourceMapConfig: Line Offset Number is not a number';
      logger.error(msg);
      throw new Error(msg);
    }
  }
  if (rebase.columnOffset !== undefined) {
    config.columnOffset = Number(rebase.columnOffset);
    if (isNaN(config.columnOffset)) {
      const msg = 'SourceMapConfig: Column Offset is not a number';
      logger.error(msg);
      throw new Error(msg);
    }
  }

  const newWasmPath = rebase.newWasmPath;
  if (newWasmPath !== undefined) {
    if (typeof newWasmPath !== 'string') {
      const msg = 'SourceMapConfig: `newWasmPath` is expected to be a string';
      logger.error(msg);
      throw new Error(msg);
    }
    config.newWasmPath = newWasmPath;
  }

  config.relativePaths = rebase.relativePaths ?? false;
  if (typeof config.relativePaths !== 'boolean') {
    const msg = 'SourceMapConfig: `relativePaths` is expected to be a boolean';
    logger.error(msg);
    throw new Error(msg);
  }
  return config;
}
