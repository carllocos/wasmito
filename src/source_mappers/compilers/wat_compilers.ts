import { exec } from 'child_process';
import { createLogger, getGlobalLogger } from '../../logger/logger';
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
  getFileName,
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

const logger = createLogger('WATCompiler');

export class WATCompilerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WATCompilerError';
    Error.captureStackTrace(this, WATCompilerError);
  }
}

export class WATCompiler extends SourceCodeCompiler {
  private readonly compilationOutputDir: string;

  constructor(compilationOutputDir: string) {
    super();
    this.compilationOutputDir = getAbsolutePath(compilationOutputDir);
  }

  async compile(
    sourceCodeFilePath: string,
    wasmOutputFile?: string,
  ): Promise<SourceMap> {
    const fileName = getFileName(wasmOutputFile ?? sourceCodeFilePath);
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
      sourceCodeFilePath,
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
      sourceCodeFilePath,
      wasmOutputFilePath,
      objDumpDetailsOutputFile,
      objDumpDissembleOutputFile,
      lineInfoPairs,
    );
  }
}
async function runCommand(command: string): Promise<[string, string]> {
  const resp = await new Promise<[string, string]>((resolve, reject) => {
    getGlobalLogger().info(`Running command: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error !== null) {
        reject(error);
      } else {
        resolve([stdout, stderr]);
      }
    });
  });
  return resp;
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
  const [linesSourceMap, errorMsg] = await runCommand(command);
  if (errorMsg !== '') {
    const msg = `failed to compile wat2wasm reason: ${errorMsg}`;
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
  const [outputCmdDetails, errMsgDetails] = await runCommand(detailsCommand);
  // const sourceMap = EmptySourceMap();

  if (errMsgDetails !== '') {
    throw new WATCompilerError(
      `Command '${detailsCommand}' failed reason: ${errMsgDetails}`,
    );
  }
  // save the output to a file
  logger.info(`Saving obj-dump -x sections at ${objDumpDetailsOutputFile}`);
  writeFileSync(objDumpDetailsOutputFile, outputCmdDetails);

  const dissembleCommand = `${objDump} -d ${wasmFilePath}`;
  const [outputDissamble, errMsgDissamble] = await runCommand(dissembleCommand);
  if (errMsgDissamble !== '') {
    throw new WATCompilerError(
      `Command '${dissembleCommand}' failed reason: ${errMsgDissamble}`,
    );
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
  const [, stderr] = await runCommand(command);
  if (stderr !== '') {
    throw new WATCompilerError(
      `error occureding during conversion to C headerfile reason: ${stderr}`,
    );
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
