import { createLogger } from '../../logger/logger';
import {
  WASMFunction,
  type SourceMap,
  type SourceCodeMapping,
} from '../source_map';
import { SourceCodeCompiler } from './compiler';
import {
  getPath2ObjDump,
  getPath2WAT2WASM,
  getPath2XXD,
} from '../../project_config';
import { WATSourceMap } from '../wat/wat_source_map';
import {
  getAbsolutePath,
  getFileExtension,
  getFileName,
  isFilePath,
  removeFileExtension,
} from '../../util/file_util';
import path from 'path';
import {
  extractAddressInformation,
  getFunctionInfos,
  getGlobalInfos,
  getImportInfos,
  getTypeInfos,
  type LineInfoPairs,
  type LineInfo,
  type FunctionInfo,
} from '../parsers/obj-dump_parser';
import { writeFileSync } from 'fs';
import { type WasmType } from '../../state/opcode_type';
import { parseOpcodesFromDissambledOutput } from '../parsers/dissambled';
import { runCommand } from '../../util/process_command';

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
  private readonly compilationOutputDir: string;

  constructor(compilationOutputDir: string) {
    super();
    this.compilationOutputDir = getAbsolutePath(compilationOutputDir);
    logger.info(
      `WATCompiler selected compiling to output ${this.compilationOutputDir}`,
    );
  }

  static override async createCompiler(
    compilerOutputPath: string,
    compilerArgs?: any,
  ): Promise<WATCompiler> {
    return new WATCompiler(compilerOutputPath);
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

    const sourceMapFileOutput = path.join(
      this.compilationOutputDir,
      `${noExtension}.wabt_map`,
    );
    const lineInfoPairs = await compileWAT2WASM(
      sourceCodePath,
      wasmOutputFilePath,
      sourceMapFileOutput,
    );
    const headerFilePath = path.join(
      this.compilationOutputDir,
      `${noExtension}.h`,
    );

    await createCHeaderFile(wasmOutputFilePath, headerFilePath);

    const objDumpDetailsOutputFile = path.join(
      this.compilationOutputDir,
      `${noExtension}.details`,
    );
    const objDumpDissembleOutputFile = path.join(
      this.compilationOutputDir,
      `${noExtension}.diss`,
    );
    return await buildWATSourceMap(
      sourceCodePath,
      wasmOutputFilePath,
      objDumpDetailsOutputFile,
      objDumpDissembleOutputFile,
      lineInfoPairs,
    );
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

function fromFunctionInfoToWASMFunc(
  fun: FunctionInfo,
  types: Map<number, WasmType>,
): WASMFunction {
  const funcType = types.get(fun.type);
  if (funcType === undefined) {
    throw new WATCompilerError(
      `Could not find type ${fun.type} for function ${fun.name}`,
    );
  } else {
    const opcodes: SourceCodeMapping[] = [];
    return new WASMFunction(fun.name, fun.index, opcodes, funcType, fun.locals);
  }
}

async function buildWATSourceMap(
  watFilePath: string,
  wasmFilePath: string,
  objDumpDetailsOutputFile: string,
  objDumpDissambleOutputFile: string,
  lines: LineInfoPairs[],
): Promise<WATSourceMap> {
  // generate obj dump file
  const objDump = getPath2ObjDump();
  const detailsCommand = `${objDump} -x -m ${wasmFilePath}`;
  const [outputCmdDetails, errMsgDetails, errorDetails] =
    await runCommand(detailsCommand);

  if (errMsgDetails !== '' || errorDetails !== null) {
    let errMsg = `Command '${detailsCommand}' failed reason: `;
    if (errMsgDetails !== '') {
      errMsg += errMsgDetails;
    } else {
      errMsg += `${errorDetails?.name}: ${errorDetails?.message}`;
    }
    logger.error(errMsg);
    throw new WATCompilerError(errMsg);
  }
  // save the output to a file
  logger.info(`Saving obj-dump -x sections at ${objDumpDetailsOutputFile}`);
  writeFileSync(objDumpDetailsOutputFile, outputCmdDetails);

  const dissembleCommand = `${objDump} -d ${wasmFilePath}`;
  const [outputDissamble, errMsgDissamble, errorDissamble] =
    await runCommand(dissembleCommand);
  if (errMsgDissamble !== '' || errorDissamble !== null) {
    let errMsg = `Command '${dissembleCommand}' failed reason: `;
    if (errMsgDissamble !== '') {
      errMsg += errMsgDissamble;
    } else {
      errMsg += `${errorDissamble?.name}: ${errorDissamble?.message}`;
    }
    logger.error(errMsg);
    throw new WATCompilerError(errMsg);
  }
  // save the output to a file
  logger.info(
    `Saving obj-dump -d dissamble output at ${objDumpDissambleOutputFile}`,
  );
  writeFileSync(objDumpDissambleOutputFile, outputDissamble);

  const opcodes = parseOpcodesFromDissambledOutput(outputDissamble);
  if (opcodes === undefined) {
    throw new WATCompilerError(`Could not parse opcodes`);
  }
  const moduleTypes = getTypeInfos(outputCmdDetails);
  const importedFuncs = getImportInfos(outputCmdDetails).map((fun) => {
    return fromFunctionInfoToWASMFunc(fun, moduleTypes);
  });
  const lineMappings = new Map<number, LineInfoPairs>();
  lines.forEach((lineMapping) => {
    lineMappings.set(lineMapping.lineAddress, lineMapping);
  });
  const functions = getFunctionInfos(outputCmdDetails)
    .map((fun) => {
      return fromFunctionInfoToWASMFunc(fun, moduleTypes);
    })
    .map((fun) => {
      const funcOpcodes = opcodes.get(fun.id);
      if (funcOpcodes === undefined) {
        throw new WATCompilerError(`Could not parse opcodes`);
      }
      const opcodesWithLineNrs = funcOpcodes.opcodes.map((opcode) => {
        const mapping = lineMappings.get(opcode.address);
        if (mapping === undefined) {
          throw new WATCompilerError(`Could not parse opcodes`);
        }
        return {
          address: opcode.address,
          linenr: mapping.lineInfo.line,
          columnStart: mapping.lineInfo.columnStart,
          columnEnd: mapping.lineInfo.columnEnd,
          opcode: opcode.opcode,
        };
      });

      return new WASMFunction(
        fun.name,
        fun.id,
        opcodesWithLineNrs,
        fun.type,
        fun.locals,
      );
    });

  // fix the missing types of opcodes
  functions.forEach((fun) => {
    const funsCalled = fun.mappings
      .filter((op) => {
        return op.opcode.name.includes('call');
      })
      .map((op) => {
        const funcNr = op.opcode.immediate;
        if (funcNr === undefined) {
          throw new Error(`found Nr not provided in opcode ${op.opcode.name}`);
        }

        return { opcode: op.opcode, funCalled: funcNr };
      });

    for (const callOpcode of funsCalled) {
      let func: WASMFunction | undefined;
      if (callOpcode.funCalled >= importedFuncs.length) {
        func = functions.find((f) => {
          return f.id === callOpcode.funCalled;
        });
      } else {
        func = importedFuncs.find((f) => {
          return f.id === callOpcode.funCalled;
        });
      }
      if (func === undefined) {
        throw new Error(
          `fun called with ID ${callOpcode.funCalled} is not part of the defined or imported funcs`,
        );
      }
      callOpcode.opcode.changeType(func.type);
    }
  });

  const globalInfos = getGlobalInfos(outputCmdDetails);
  return new WATSourceMap(
    watFilePath,
    wasmFilePath,
    Array.from(moduleTypes.values()),
    globalInfos,
    functions,
    importedFuncs,
  );
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
