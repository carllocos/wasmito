import * as fs from 'fs';
import { createLogger } from '../../logger/logger';
import {
  isFilePath,
  getAbsolutePath,
  getFileExtension,
  readFileAsJSON as readJSONFile,
  isDirectoryPath,
  pathJoin,
  getFileName,
  removeFileExtension,
} from '../../util/file_util';

const logger = createLogger('ASConfig');

export class ASConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ASConfigError';
    Error.captureStackTrace(this, ASConfigError);
  }
}

interface ASConfigTarget {
  name: string;
  debug?: boolean;
  outFile: string;
  textFile: string;
}

interface ASConfigArgs {
  entries: string[];
  targets: ASConfigTarget[];
}

function parseDebugASConfigTarget(
  targetName: string,
  args: any,
): ASConfigTarget {
  if (typeof args !== 'object') {
    throw new ASConfigError('ASConfigTarget expected to be an object');
  }

  const outFile = args.outFile;
  if (typeof outFile !== 'string') {
    throw new ASConfigError('outFile is mandatory and expected to be a string');
  }

  const textFile = args.textFile;
  if (typeof textFile !== 'string') {
    throw new ASConfigError(
      'textFile is mandatory and expected to be a string',
    );
  }

  const debug = args.debug;
  if (debug === undefined || typeof debug !== 'boolean') {
    throw new ASConfigError('debug is mandatory and expected to be a boolean');
  }

  return {
    name: targetName,
    debug,
    textFile,
    outFile,
  };
}

function parseASConfigTargets(args: any): ASConfigTarget[] {
  if (typeof args !== 'object') {
    throw new ASConfigError('targets is expected to be an object');
  }

  logger.debug(`Only parsing 'debug' target. Other targets are ignored`);
  const targetsNames = Object.keys(args);

  let target: ASConfigTarget | undefined;
  for (let i = 0; i < targetsNames.length; i++) {
    const tn = targetsNames[i];
    try {
      target = parseDebugASConfigTarget(tn, args[tn]);
      break;
    } catch (e) {}
  }

  if (target === undefined) {
    throw new ASConfigError("No target provided with 'debug' set to true");
  }
  return [target];
}

const allowedFileExtensions = new Set(['as', 'ts']);

export class ASConfig {
  public readonly srcRootPath: string;
  public readonly configPath: string;
  public readonly originalConfigPath: string;
  private readonly _config: ASConfigArgs;
  private readonly _debugTarget: ASConfigTarget;
  public readonly sourceMappersPath: string;
  private readonly _wasmPath: string;
  private readonly _prefixFileName: string;

  constructor(
    srcRootPath: string,
    configPath: string,
    originalConfigPath: string,
    config: ASConfigArgs,
  ) {
    this.srcRootPath = srcRootPath;
    this.configPath = configPath;
    this.originalConfigPath = originalConfigPath;
    this._config = config;
    const dt = config.targets.find((tg) => {
      return tg.debug !== undefined && tg.debug;
    });

    if (dt === undefined) {
      throw new ASConfigError('one debug target is expected');
    }
    this._debugTarget = dt;
    this.sourceMappersPath = `${dt.outFile}.map`;
    this._wasmPath = dt.outFile;
    this._prefixFileName = removeFileExtension(getFileName(dt.outFile));
  }

  get debugTarget(): ASConfigTarget {
    return this._debugTarget;
  }

  get prefixFileName(): string {
    return this._prefixFileName;
  }

  get wasmPath(): string {
    return this._wasmPath;
  }

  storeToJSONFile(): void {
    const content: any = {
      entries: this._config.entries,
      options: {
        disable: [
          'mutable-globals',
          'sign-extension',
          'nontrapping-f2i',
          'bulk-memory',
        ],
        exportTable: true,
        exportRuntime: false,
        maximumMemory: 2,
        noAssert: false,
        runtime: 'stub',
        sourceMap: true,
      },
    };
    const targets: any = {};
    targets[this._debugTarget.name] = Object.assign({}, this._debugTarget);
    content.targets = targets;

    const contentStr = JSON.stringify(content);
    fs.writeFileSync(this.configPath, contentStr, 'utf-8');
  }

  static async createASConfig(
    pathToSrcRoot: string,
    pathToJSONConfig: string,
    newPathToJSONConfig: string,
    outputDir: string,
  ): Promise<ASConfig> {
    const absSrcPath = getAbsolutePath(pathToSrcRoot);
    if (!isDirectoryPath(absSrcPath)) {
      throw new ASConfigError(
        `the given pathToSrcRoot '${absSrcPath}' either does not exists or does not point to a directory`,
      );
    }

    const ext = getFileExtension(pathToJSONConfig);
    if (ext !== 'json') {
      throw new ASConfigError(
        `expected a json file but the provided AS config has as extension ${ext}`,
      );
    }
    const absPath = getAbsolutePath(pathToJSONConfig);
    if (!isFilePath(absPath)) {
      throw new ASConfigError(`provided unexisting filepath ${absPath}`);
    }

    const content = await readJSONFile(absPath);
    if (typeof content !== 'object') {
      throw new ASConfigError('WATCompilerArgs expected to be an object');
    }

    let entries = content.entries;
    if (
      !Array.isArray(entries) ||
      entries.find((e) => {
        return typeof e !== 'string';
      }) !== undefined
    ) {
      throw new ASConfigError('entries is expected to be an array of strings');
    }

    const invalidEntry = entries.find((e) => {
      const fe = getFileExtension(e);
      return fe === undefined || !allowedFileExtensions.has(fe);
    });
    if (invalidEntry !== undefined) {
      throw new ASConfigError(
        `entries should only contain assemblyscript source codes. Entry ${invalidEntry} is invalid`,
      );
    }

    entries = entries.map((e) => {
      const entryPath = pathJoin(absSrcPath, e);
      if (!isFilePath(entryPath)) {
        throw new ASConfigError(`Invalid entry file path given ${entryPath}`);
      }
      return entryPath;
    });

    const absOutputPath = getAbsolutePath(outputDir);
    const targets = parseASConfigTargets(content.targets).map((t) => {
      return {
        name: t.name,
        debug: t.debug,
        outFile: pathJoin(absOutputPath, t.outFile),
        textFile: pathJoin(absOutputPath, t.textFile),
      };
    });

    return new ASConfig(absSrcPath, newPathToJSONConfig, absPath, {
      entries,
      targets,
    });
  }
}

export async function parseASConfigFromPath(
  pathToASConfig: string,
  pathToSrcRoot: string,
  compilerOutputDir: string,
): Promise<ASConfig> {
  const newConfigPath = pathJoin(compilerOutputDir, 'asconfig.json');
  const config = await ASConfig.createASConfig(
    pathToSrcRoot,
    pathToASConfig,
    newConfigPath,
    compilerOutputDir,
  );

  return config;
}
