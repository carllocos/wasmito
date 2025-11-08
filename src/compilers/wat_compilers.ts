import { createLogger } from '../logger/logger';
import { SourceCodeCompiler } from './compiler';
import { getPath2XXD } from '../project_config';
import { createSourceMapForWAT } from '../source_mappers/wat/wat_source_map';
import {
  getAbsolutePath,
  getFileExtension,
  getFileName,
  isFilePath,
  removeFile,
  removeFileExtension,
} from '../util/file_util';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

import { runCommand } from '../util/process_command';
import { TargetLanguage } from './prog_language_selection';
import {
  type LanguageAdaptor,
  constructLanguageAdaptor,
} from '../language_adaptors/language_adaptor';
import { Module, ParseError } from 'wasmito-tools';
import { SourceCodeLocation } from '../source_mappers';

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

  async compile(compilationArgs: WATCompilerArgs): Promise<LanguageAdaptor> {
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

    const mappings = await compileWAT2WASM(
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
    const sm = createSourceMapForWAT(
      mappings,
      sourceCodePath,
      wasmOutputFilePath,
    );
    this._latestWATCompileArgs = args;
    return await constructLanguageAdaptor(sm);
  }
}

async function compileWAT2WASM(
  sourcefilePath: string,
  wasmOutputFile: string,
  _linesInfoOutputFile: string,
): Promise<SourceCodeLocation[]> {
  logger.info(`Compiling wat to wasm: ${sourcefilePath} -> ${wasmOutputFile}`);
  const watContent = readFileSync(sourcefilePath, 'utf-8');
  try {
    const wasm = Module.from_wat(sourcefilePath, watContent);
    const mappings: SourceCodeLocation[] = [];
    for (const m of wasm.addr2line_mappings()) {
      const source = m.file;
      if (source === undefined) {
        continue;
      }

      const linenr = m.line;
      if (linenr === undefined) {
        continue;
      }

      mappings.push({
        source,
        address: Number(m.address),
        linenr,
        colnr: m.column ?? 0,
        name: '',
      });
    }
    writeFileSync(wasmOutputFile, Buffer.from(wasm.bytes));
    //   logger.info(`Saving wabt_sourcemap to filepath: ${linesInfoOutputFile}`);
    //   writeFileSync(linesInfoOutputFile, linesSourceMap);
    return mappings;
  } catch (error) {
    let msg = `Parsing WAT failed failed reason: `;
    if (error instanceof ParseError) {
      msg += error.context;
    } else {
      msg += error;
    }
    throw new WATCompilerError(msg);
  }
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
