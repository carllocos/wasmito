import { SourceCodeCompiler } from './compiler';
import { createLogger } from '../../logger/logger';
import {
  createDirectoryIfUnexisting,
  isFilePath,
  getAbsolutePath,
  getFileExtension,
  readFileAsJSON as readJSONFile,
  isDirectoryPath,
  pathJoin,
  getDirectory,
  getFileName,
  removeFileExtension,
  isAbsolutePath,
} from '../../util/file_util';
import {
  getPath2AssemblyScriptCompiler,
  getPath2NPX,
} from '../../project_config';
import { runCommand } from '../../util/process_command';
import * as fs from 'fs';
import { AssemblyScriptSourceMap } from '../assemblyscript/assembly_script_source_map';
import { type MappingItem, SourceMapConsumer } from 'source-map';
// import { SourceCodeLocation } from '../source_map';

const logger = createLogger('AssemblyScriptCompiler');
const allowedFileExtensions = new Set(['as', 'ts']);

export class AssemblyScriptCompilerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssemblyScriptError';
    Error.captureStackTrace(this, AssemblyScriptCompilerError);
  }
}

export class ASConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ASConfigError';
    Error.captureStackTrace(this, ASConfigError);
  }
}

export interface AssemblyScriptCompilerArgs {
  pathToASConfig: string;
  pathToSrcRoot: string;
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

function parseAssemblyScriptArgs(args: any): AssemblyScriptCompilerArgs {
  if (typeof args !== 'object') {
    throw new ASConfigError(
      'AssemblyScriptCompilerArgs expected to be an object',
    );
  }

  const pathToASConfig = args.pathToASConfig;
  if (typeof pathToASConfig !== 'string') {
    throw new ASConfigError(
      'pathToASConfig is mandatory and expected to be a string',
    );
  }

  const pathToSrcRoot = args.pathToSrcRoot;
  if (typeof pathToSrcRoot !== 'string') {
    throw new ASConfigError(
      'pathToSrcRoot is mandatory and expected to be a string',
    );
  }
  return {
    pathToASConfig,
    pathToSrcRoot,
  };
}

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

export class AssemblyScriptCompiler extends SourceCodeCompiler {
  public readonly config: ASConfig;
  private readonly _outputDir: string;

  constructor(compilerConfig: ASConfig, outputDir: string) {
    super();
    this.config = compilerConfig;
    this._outputDir = outputDir;
    logger.info(`AssemblyScriptCompiler selected`);
  }

  async compile(
    pathToASConfig: string,
    wasmOutputFile?: string | undefined,
  ): Promise<AssemblyScriptSourceMap> {
    await buildAssemblyScriptFromConfig(this.config);
    const content = await fs.promises.readFile(this.config.sourceMappersPath);
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
      if (source.startsWith(`${this.config.prefixFileName}/`)) {
        logger.debug(`Removing prefix from AssemblyScript source '${source}'`);
        source = source.slice(
          this.config.prefixFileName.length + 1,
          source.length,
        );
      }

      if (!isAbsolutePath(source)) {
        logger.debug(`Creating absolute path for source '${source}`);
        source = pathJoin(this.config.srcRootPath, source);
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

    const sm = new AssemblyScriptSourceMap(
      this.config,
      sourceAbsPath,
      mappings,
    );
    await sm.createAST();
    return sm;
  }

  static override async createCompiler(
    compilerArgs: any,
    compilerOutputDir: string,
  ): Promise<AssemblyScriptCompiler> {
    const paths: AssemblyScriptCompilerArgs =
      parseAssemblyScriptArgs(compilerArgs);

    const newConfigPath = pathJoin(compilerOutputDir, 'asconfig.json');
    const config = await ASConfig.createASConfig(
      paths.pathToSrcRoot,
      paths.pathToASConfig,
      newConfigPath,
      compilerOutputDir,
    );

    createDirectoryIfUnexisting(compilerOutputDir);
    createDirectoryIfUnexisting(getDirectory(config.debugTarget.outFile));
    createDirectoryIfUnexisting(getDirectory(config.debugTarget.textFile));

    config.storeToJSONFile();
    return new AssemblyScriptCompiler(config, compilerOutputDir);
  }
}

export async function buildAssemblyScriptFromConfig(
  config: ASConfig,
): Promise<void> {
  logger.info(`Compiling AssemblyScript`);
  const npx = getPath2NPX();
  const asc = getPath2AssemblyScriptCompiler();
  const targetName = config.debugTarget;
  const command = `${npx} ${asc} --config ${config.configPath} --target ${targetName.name}`;
  const [, errorMsg, error] = await runCommand(command, {
    cwd: config.srcRootPath,
  });
  if (errorMsg !== '' || error !== null) {
    let msg = `Command ${command} failed reason: `;
    if (errorMsg !== '') {
      msg += errorMsg;
    } else {
      msg += `${error?.name}: ${error?.message}`;
    }
    logger.error(msg);
    // WARNING:
    // when debugging with VSCode the errorMsg is filled with msg linked to the debugger
    // msgs of the form "Debugger attached" "waiting for the debugger to disconnect", etc.
    // comment next line if necessary
    // throw new AssemblyScriptCompilerError(msg);
  }

  if (!isFilePath(config.debugTarget.outFile)) {
    throw new AssemblyScriptCompilerError(
      `Failed to generate outFile '${config.debugTarget.outFile}'`,
    );
  }

  if (!isFilePath(config.debugTarget.textFile)) {
    throw new AssemblyScriptCompilerError(
      `Failed to generate textFile '${config.debugTarget.textFile}'`,
    );
  }

  if (!isFilePath(config.sourceMappersPath)) {
    throw new AssemblyScriptCompilerError(
      `Failed to generate sourceMappers '${config.sourceMappersPath}'`,
    );
  }
}
