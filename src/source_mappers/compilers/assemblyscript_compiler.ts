import { SourceCodeCompiler } from './compiler';
import { createLogger } from '../../logger/logger';
import {
  createDirectoryIfUnexisting,
  isFilePath,
  getAbsolutePath,
} from '../../util/file_util';
import {
  getPath2AssemblyScriptCompiler,
  getPath2NPX,
} from '../../project_config';
import { runCommand } from '../../util/process_command';
import { AssemblyScriptSourceMap } from '../assemblyscript/assembly_script_source_map';
import { TargetLanguage } from './prog_language_selection';
import {
  type ASConfig,
  ASConfigError,
  parseASConfigFromPath,
} from '../assemblyscript/asconfig';

const logger = createLogger('AssemblyScriptCompiler');

export class AssemblyScriptCompilerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssemblyScriptError';
    Error.captureStackTrace(this, AssemblyScriptCompilerError);
  }
}

export interface AssemblyScriptCompilerArgs {
  pathToASConfig: string;
  pathToSrcRoot: string;
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

export class AssemblyScriptCompiler extends SourceCodeCompiler {
  public targetLanguage: TargetLanguage;
  public config?: ASConfig;
  private readonly _outputDir: string;

  constructor(outputDir: string) {
    super();
    this._outputDir = getAbsolutePath(outputDir);
    this.targetLanguage = TargetLanguage.AssemblyScript;
    logger.info(`AssemblyScriptCompiler selected`);
  }

  get latestSourceCodeCompilerArgs(): any {
    throw new Error('Method not implemented.');
  }

  async compile(
    compilerArgs: AssemblyScriptCompilerArgs,
  ): Promise<AssemblyScriptSourceMap> {
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

export async function runNPXCommand(config: ASConfig): Promise<void> {
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
