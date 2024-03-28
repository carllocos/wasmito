import { createLogger } from '../../logger/logger';
import { type SourceMap } from '../source_map';
import { SourceCodeCompiler } from './compiler';
import { getPath2WAT2WASM, getPath2XXD } from '../../project_config';
import { WATSourceMap } from '../wat/wat_source_map';
import {
  getAbsolutePath,
  getFileExtension,
  getFileName,
  isFilePath,
  removeFile,
  removeFileExtension,
} from '../../util/file_util';
import path from 'path';
import {
  extractAddressInformation,
  type LineInfoPairs,
  type LineInfo,
} from '../parsers/obj-dump_parser';
import { writeFileSync } from 'fs';
import { runCommand } from '../../util/process_command';
import { TargetLanguage } from './prog_language_selection';

const logger = createLogger('WATCompiler');

export class WATCompilerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WATCompilerError';
    Error.captureStackTrace(this, WATCompilerError);
  }
}

export interface WATCompilerArgs {
  sourceCodePath: string;
  wasmOutputPath?: string;
}

function createAndAssertWATCompilerArgs(args: any): WATCompilerArgs {
  if (typeof args !== 'object') {
    throw new WATCompilerError('expected to be passed as an object');
  }

  let sp = args.sourceCodePath;
  if (sp === undefined || typeof sp !== 'string') {
    throw new WATCompilerError(
      'sourceCodePath is mandatory and expected to be passed a string',
    );
  }

  const fileType = getFileExtension(sp);
  if (fileType === undefined) {
    throw new WATCompilerError(
      "sourceCodePath has no file extension. Should end with 'wat' or 'wast'",
    );
  } else if (fileType !== 'wat' && fileType !== 'wast') {
    throw new WATCompilerError(
      `sourceCodePath has an invalid file extension expected 'wat' or 'wast' given ${fileType}`,
    );
  }
  sp = getAbsolutePath(sp);
  if (!isFilePath(sp)) {
    throw new WATCompilerError(
      `sourceCodePath points to an unexisting file ${sp}`,
    );
  }

  const wasmOut = args.wasmOutputFilePath;
  if (wasmOut !== undefined) {
    if (typeof wasmOut !== 'string') {
      throw new WATCompilerError(
        'wasmOutputFilePath is expected to be a string',
      );
    }

    const fileTypeOut = getFileExtension(wasmOut);
    if (fileTypeOut === undefined) {
      throw new WATCompilerError(
        "wasmOutputFilePath has no file extension. Should end with 'wasm'",
      );
    } else if (fileTypeOut !== 'wasm') {
      throw new WATCompilerError(
        `wasmOutputFilePath has an invalid file extension expected 'wasm' given ${fileTypeOut}`,
      );
    }
  }
  return {
    sourceCodePath: sp,
    wasmOutputPath: wasmOut,
  };
}

export class WATCompiler extends SourceCodeCompiler {
  public readonly targetLanguage: TargetLanguage;

  private readonly compilationOutputDir: string;
  private _latestWATCompileArgs?: WATCompilerArgs;

  constructor(compilationOutputDir: string) {
    super();
    this.compilationOutputDir = getAbsolutePath(compilationOutputDir);
    logger.info(
      `WATCompiler selected compiling to output ${this.compilationOutputDir}`,
    );
    this.targetLanguage = TargetLanguage.WAT;
  }

  get latestSourceCodeCompilerArgs(): WATCompilerArgs | undefined {
    return this._latestWATCompileArgs;
  }

  async compile(compilationArgs: WATCompilerArgs): Promise<SourceMap> {
    const args = createAndAssertWATCompilerArgs(compilationArgs);
    const sourceCodePath = args.sourceCodePath;
    const fileName = getFileName(args.wasmOutputPath ?? sourceCodePath);
    const noExtension = removeFileExtension(fileName);

    const wasmOutputFilePath = path.join(
      this.compilationOutputDir,
      `${noExtension}.wasm`,
    );
    if (isFilePath(wasmOutputFilePath)) {
      removeFile(wasmOutputFilePath);
    }

    const sourceMapFileOutput = path.join(
      this.compilationOutputDir,
      `${noExtension}.wabt_map`,
    );
    if (isFilePath(sourceMapFileOutput)) {
      removeFile(sourceMapFileOutput);
    }

    const lineInfoPairs = await compileWAT2WASM(
      sourceCodePath,
      wasmOutputFilePath,
      sourceMapFileOutput,
    );
    const headerFilePath = path.join(
      this.compilationOutputDir,
      `${noExtension}.h`,
    );
    if (isFilePath(headerFilePath)) {
      removeFile(headerFilePath);
    }

    await createCHeaderFile(wasmOutputFilePath, headerFilePath);

    const objDumpDetailsOutputFile = path.join(
      this.compilationOutputDir,
      `${noExtension}.details`,
    );
    if (isFilePath(objDumpDetailsOutputFile)) {
      removeFile(objDumpDetailsOutputFile);
    }
    const objDumpDissembleOutputFile = path.join(
      this.compilationOutputDir,
      `${noExtension}.diss`,
    );
    if (isFilePath(objDumpDissembleOutputFile)) {
      removeFile(objDumpDissembleOutputFile);
    }
    const sm = new WATSourceMap(
      lineInfoPairs,
      sourceCodePath,
      wasmOutputFilePath,
    );
    this._latestWATCompileArgs = args;
    return sm;
  }
}

async function compileWAT2WASM(
  sourcefilePath: string,
  wasmOutputFile: string,
  linesInfoOutputFile: string,
): Promise<LineInfoPairs[]> {
  logger.info(`Compiling wat to wasm: ${sourcefilePath} -> ${wasmOutputFile}`);
  const wat2wasm = getPath2WAT2WASM();
  const command =
    `${wat2wasm} --no-canonicalize-leb128s --disable-bulk-memory --debug-names -v -o ${wasmOutputFile} ` +
    sourcefilePath;
  const [linesSourceMap, errorMsg, error] = await runCommand(command);
  if (errorMsg !== '' || error !== null) {
    let msg = `Command ${command} failed reason: `;
    if (errorMsg !== '') {
      msg += errorMsg;
    } else {
      msg += `${error?.name}: ${error?.message}`;
    }
    logger.error(msg);
    throw new WATCompilerError(msg);
  }
  logger.info(`Saving wabt_sourcemap to filepath: ${linesInfoOutputFile}`);
  writeFileSync(linesInfoOutputFile, linesSourceMap);
  return makeLineInfoPairs(linesSourceMap);
}

async function createCHeaderFile(
  wasmFilePath: string,
  cHeaderFilePath: string,
): Promise<void> {
  logger.info(
    `Creating c header for at ${cHeaderFilePath} for wasm ${wasmFilePath}`,
  );
  const xxd = getPath2XXD();
  const command = `${xxd} -i ${wasmFilePath} > ${cHeaderFilePath}`;
  const [, stderr, error] = await runCommand(command);
  if (stderr !== '' || error !== null) {
    let errMsg = 'error during conversion to C headerfile reason:';
    if (stderr !== '') {
      errMsg += stderr;
    } else {
      errMsg += `${error?.name}: ${error?.message}`;
    }
    logger.error(errMsg);
    throw new WATCompilerError(errMsg);
  }
}

function makeLineInfoPairs(sourceMapInput: string): LineInfoPairs[] {
  const lines = sourceMapInput.split('\n');
  return createLineInfoPairs(lines);
}

function createLineInfoPairs(lines: string[]): LineInfoPairs[] {
  const result = [];
  let lastLineInfo: LineInfo = {
    line: -1,
    columnStart: -1,
    columnEnd: -1,
    message: 'unexisting line',
  };

  let foundFirstLineInfo = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const newLine = line.match(/@ {/);
    if (newLine !== null) {
      lastLineInfo = extractLineInfo(line);
      foundFirstLineInfo = true;
      continue;
    }
    try {
      if (!foundFirstLineInfo) {
        continue;
      }
      const addr = extractAddressInformation(line);
      const li = {
        line: lastLineInfo.line,
        columnStart: lastLineInfo.columnStart,
        columnEnd: lastLineInfo.columnEnd,
        message: lastLineInfo.message,
      };
      result.push({ lineInfo: li, lineAddress: addr });
    } catch (e) {}
  }
  return result;
}

function extractLineInfo(lineString: string): LineInfo {
  const obj = JSON.parse(lineString.substring(2));
  // ('@ { "line": 18, "col_start": 21, "col_end": 30 }');
  let msg = '';
  if (typeof obj.message === 'string') {
    msg = obj.message;
  }
  return {
    line: obj.line,
    columnStart: obj.col_start,
    columnEnd: obj.col_end,
    message: msg,
  };
}
