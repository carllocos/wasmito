import { DeviceManager } from '../../src/device/device_manager';
import { getGlobalLogger } from '../../src/logger/logger';
import { type WasmState } from '../../src/webassembly/wasm';
import { InspectStateHook } from '../../src/hooks/hook_inspect_state';
import { EmptyValueSubstitution } from '../../src/hooks/hook_value_substitution';
import { AroundFunctionRequest } from '../../src/warduino/requests/around_function_request';
import {
  type HookOnWasmAddrResponse,
  HookOnWasmAddrRequest,
  HookOnWasmAddrMoment,
} from '../../src/warduino/requests/hook_on_wasm_addr_request';
import { StateRequest } from '../../src/warduino/requests/inspect_request';
import { ResponseType } from '../../src/warduino/api/request_interface';
import * as fs from 'fs';
import { type WasmInstruction } from '../../src/webassembly/wasm/wasm_instruction';
import { PlaceholderType } from '../../src/webassembly/wasm/opcode_type';
import { exit } from 'process';
import { type WasmitoBackendVM } from '../../src/warduino/vm/warduino_vm';
import path from 'path';
import { BoardBaudRate } from '../../src/util/serial_port';
import { TargetLanguage } from '../../src/compilers/prog_language_selection';
import {
  createArduinoPlatform,
  createDevPlatform,
} from '../../src/platforms/platformbuilder_factory';
import { PlatformTarget } from '../../src/platforms/platform_config';
import { type WATCompilerArgs } from '../../src/compilers/wat_compilers';
import { type SourceMap } from '../../src/source_mappers/source_map';
// type PlatformConfigArgs,
// createPlatformBuilder,
// DevVMPlatform,
// import { makeSourceCodeCompiler } from '../../src/source_mappers';
// import { program } from 'commander';

class WriteJSON {
  private readonly maxBuffer: number;
  private readonly filepath: string;
  private content: string[] = [];
  private firstWrite: boolean;
  private readonly prefix: string;
  private readonly suffix: string;
  private addSeperator: boolean;
  private bufSize: number;

  constructor(filepath: string, maxBuffer: number) {
    this.filepath = filepath;
    this.maxBuffer = maxBuffer;
    this.firstWrite = true;
    this.prefix = '{"monitored":[';
    this.suffix = ']}';
    this.addSeperator = false;
    this.bufSize = 0;
  }

  public write(obj: any): void {
    if (this.firstWrite) {
      fs.writeFileSync(this.filepath, this.prefix, 'utf-8');
      this.firstWrite = false;
      this.addSeperator = false;
    }

    if (this.addSeperator) {
      this.content.push(',');
    }

    this.content.push(JSON.stringify(obj));
    this.addSeperator = true;
    this.bufSize += 1;

    if (this.bufSize >= this.maxBuffer) {
      const jsonData = this.content.join('');
      fs.appendFile(this.filepath, jsonData, 'utf-8', (err) => {
        if (err !== null) {
          getGlobalLogger().error(`Error writing to file ${this.filepath}`);
        }
      });
      this.content = [];
      this.bufSize = 0;
    }
  }

  public close(): void {
    fs.appendFileSync(this.filepath, this.suffix);
  }
}

class BrigadierJSONWriter {
  private readonly writer: WriteJSON;
  private readonly befores: Map<
    number,
    [number, WasmInstruction, string, number[]]
  >;

  private readonly after: Map<number, [WasmInstruction, string]>;

  constructor(writer: WriteJSON) {
    this.writer = writer;
    this.befores = new Map();
    this.after = new Map();
  }

  public addBefore(addr: number, instruction: WasmInstruction): void {
    this.befores.set(addr, [
      addr,
      instruction,
      instruction.getArgs().join(' '),
      [],
    ]);
  }

  public addAfter(addr: number, instruction: WasmInstruction): void {
    this.after.set(addr, [instruction, instruction.getArgs().join(' ')]);
  }

  public writeBefore(
    address: number,
    linenr: number,
    columnStart: number,
    columnEnd: number,
    state: WasmState,
  ): void {
    const val = this.befores.get(address);
    if (val === undefined) {
      getGlobalLogger().error(`No before saved for address ${address}`);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [addr, opcode, labels, _args] = val;
    const opcodeType = opcode.signature;
    if (opcodeType instanceof PlaceholderType) {
      getGlobalLogger().error(
        `Opcode Type still needs to be determined for opcode: ${opcode.name} at addr ${address}`,
      );
      return;
    }
    const operands: number[] = [];
    if (opcode.immediate !== undefined) {
      operands.push(opcode.immediate);
    }

    if (state.pc !== address) {
      getGlobalLogger().error(
        `Monitored before addr does not match monitored pc: expected ${address} got ${state.pc}`,
      );
    } else if (state.stack !== undefined) {
      if (state.stack.length < opcodeType.nrArgs) {
        getGlobalLogger().error(
          `Stack contains insufficient values for to be used as arguments for opcode ${opcode.name} ${labels}. Opcode expects #${opcode.signature.nrArgs} stack has size #${state.stack.length}`,
        );
      } else if (opcodeType.nrArgs > 0) {
        const ops = state.stack.slice(
          state.stack.length - opcode.signature.nrArgs,
          state.stack.length,
        );
        ops.forEach((o) => {
          operands.push(o.value);
        });
        this.befores.set(address, [addr, opcode, labels, operands]);
      }
    } else {
      getGlobalLogger().error(
        `Stack is undefined for ${opcode.name} ${labels} address #${address}`,
      );
    }
    const content = {
      op: opcode.name,
      labels,
      when: 'before',
      operands,
      linenr,
      columnstart: columnStart,
      columnend: columnEnd,
    };
    this.writer.write(content);
  }

  public writeAfter(
    address: number,
    linenr: number,
    columnStart: number,
    columnEnd: number,
    state: WasmState,
  ): void {
    const val = this.after.get(address);
    if (val === undefined) {
      getGlobalLogger().error(`No after saved for address ${address}`);
      return;
    }
    const [opcode, labels] = val;

    const opcodeType = opcode.signature;
    if (state.stack === undefined) {
      getGlobalLogger().error(
        `Stack is undefined for ${opcode.name} address #${address}`,
      );
    } else if (opcodeType.hasResult() && state.stack.length < 1) {
      getGlobalLogger().error(
        `Stack should contain the result of running opcode ${opcode.name} ${labels}`,
      );
    } else {
      const beforeMonitoring = this.befores.get(address);
      if (beforeMonitoring === undefined) {
        getGlobalLogger().error(
          `operands for ${opcode.name} ${labels} were not registered during the before monitoring`,
        );
        return;
      }

      const operands: number[] = beforeMonitoring[3];
      if (operands.length < opcodeType.nrArgs) {
        getGlobalLogger().error(
          `not all operands for ${
            opcode.name
          } ${labels} were registered during the before monitoring. Expected #${
            opcodeType.nrResults
          } operands got [${operands.join(' ')}]`,
        );
        return;
      }

      const results: number[] = [];
      if (opcodeType.hasResult()) {
        if (state.stack.length < 1) {
          getGlobalLogger().error(
            `Stack does not contain a value. Altough opcodel ${opcode.name} ${labels} produces a result`,
          );
          return;
        }
        results.push(state.stack[state.stack.length - 1].value);
      }

      const content = {
        op: opcode.name,
        labels,
        when: 'after',
        operands,
        result: results,
        linenr,
        columnstart: columnStart,
        columnend: columnEnd,
      };
      this.writer.write(content);
    }
  }
}

function allSucceeded(replies: HookOnWasmAddrResponse[]): boolean {
  let idx = 0;
  while (idx < replies.length) {
    const reply = replies[idx];
    if (reply.responseType !== ResponseType.SuccessResponse) {
      return false;
    }
    idx++;
  }
  return true;
}

function logReplies(replies: HookOnWasmAddrResponse[]): void {
  replies.forEach((reply) => {
    if (reply.responseType === ResponseType.SuccessResponse) {
      getGlobalLogger().debug(`SucessResponse(interrupt=${reply.interrupt})`);
    } else if (reply.responseType === ResponseType.ErrorResponse) {
      getGlobalLogger().debug(
        `ErrorResponse(interrupt=${reply.interrupt}, error_code=${reply.error_code})`,
      );
    } else if (reply.responseType === ResponseType.SubscriptionResponse) {
      getGlobalLogger().debug(
        `SubscriptionMessage(interrupt=${reply.interrupt}, sub=${reply.sub})`,
      );
    }
  });
}

let Brigadier: BrigadierJSONWriter | undefined;

function createJSONWriter(
  address: number,
  linenr: number,
  columnStart: number,
  columnEnd: number,
  instruction: WasmInstruction,
  when: HookOnWasmAddrMoment,
): (state: WasmState) => void {
  if (Brigadier === undefined) {
    throw new Error('set Brigadier first');
  }
  if (when === HookOnWasmAddrMoment.HookBefore) {
    Brigadier.addBefore(address, instruction);
  } else {
    Brigadier.addAfter(address, instruction);
  }
  return (state: WasmState) => {
    if (when === HookOnWasmAddrMoment.HookBefore) {
      Brigadier?.writeBefore(address, linenr, columnStart, columnEnd, state);
    } else {
      Brigadier?.writeAfter(address, linenr, columnStart, columnEnd, state);
    }
  };
}

async function registerSubstitueValueHook(
  em: WasmitoBackendVM,
  sourceMap: SourceMap,
): Promise<boolean> {
  const chipLedCSetup = sourceMap.getFunction(5);
  const chipLedCAttachPin = sourceMap.getFunction(6);
  const chipAnalogWrite = sourceMap.getFunction(7);
  const funcs = [chipLedCSetup, chipLedCAttachPin, chipAnalogWrite];
  if (
    chipLedCSetup === undefined ||
    chipLedCAttachPin === undefined ||
    chipAnalogWrite === undefined
  ) {
    return false;
  }
  const requests = funcs.map(async (f) => {
    if (f === undefined) {
      throw new Error('undefined function found');
    }
    const fId = f?.id === undefined ? 0 : f.id;
    const req = new AroundFunctionRequest(fId).addHook(
      new EmptyValueSubstitution(),
    );
    return await em.sendRequest(req);
  });
  const replies = await Promise.all(requests);

  logReplies(replies);
  return allSucceeded(replies);
}

async function registerBeforeHooks(
  em: WasmitoBackendVM,
  sourceMap: SourceMap,
): Promise<boolean> {
  const opcodesBeforeRequests = sourceMap.wasm.instructions
    .map((inst) => {
      if (inst.startAddress === undefined) {
        throw new Error(`Start address should not be undefined`);
      }
      const m = sourceMap.getOriginalPositionFor(inst.startAddress);
      if (m.length === 0) {
        throw new Error(
          `address ${inst.startAddress} should have an original Position`,
        );
      }
      return m;
    })
    .map((mappings) => {
      const { address, linenr, colnr } = mappings[0];
      const columnStart = colnr;
      const columnEnd = columnStart;
      const opcode = sourceMap.wasm.instructionFromAddress(address); // TODO create opcodenr to string
      if (opcode === undefined) {
        throw new Error(`Instruction not found for addr ${address}`);
      }
      const inspectStackRequest = new StateRequest().includeStack().includePC();
      const inspectStack = new InspectStateHook(inspectStackRequest);
      inspectStack.onSubscriptionData = createJSONWriter(
        address,
        linenr,
        columnStart,
        columnEnd,
        opcode,
        HookOnWasmAddrMoment.HookBefore,
      );
      return new HookOnWasmAddrRequest(address).before().addHook(inspectStack);
    });

  const repliesBefore = await Promise.all(
    opcodesBeforeRequests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(repliesBefore);
  if (!allSucceeded(repliesBefore)) {
    return false;
  }
  return true;
}

async function registerAfterHooks(
  em: WasmitoBackendVM,
  sourceMap: SourceMap,
): Promise<boolean> {
  const opcodesAfterRequests = sourceMap.wasm.instructions
    .map((inst) => {
      if (inst.startAddress === undefined) {
        throw new Error(`Start address should not be undefined`);
      }
      const m = sourceMap.getOriginalPositionFor(inst.startAddress);
      if (m.length === 0) {
        throw new Error(
          `address ${inst.startAddress} should have an original Position`,
        );
      }
      return m;
    })
    .map((mappings) => {
      const { address, linenr, colnr } = mappings[0];
      const columnStart = colnr;
      const columnEnd = columnStart;
      const opcode = sourceMap.wasm.instructionFromAddress(address); // TODO create opcodenr to string
      if (opcode === undefined) {
        throw new Error(`Instruction not found for addr ${address}`);
      }
      const inspectStackRequest = new StateRequest().includeStack().includePC();
      const inspectStack = new InspectStateHook(inspectStackRequest);
      inspectStack.onSubscriptionData = createJSONWriter(
        address,
        linenr,
        columnStart,
        columnEnd,
        opcode,
        HookOnWasmAddrMoment.HookAfter,
      );
      return new HookOnWasmAddrRequest(address).after().addHook(inspectStack);
    });

  const repliesAfter = await Promise.all(
    opcodesAfterRequests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(repliesAfter);
  if (!allSucceeded(repliesAfter)) {
    return false;
  }
  return true;
}

async function registerAllHooks(
  em: WasmitoBackendVM,
  registerSubstitue: boolean,
): Promise<boolean> {
  let s1 = true;
  if (registerSubstitue) {
    s1 = await registerSubstitueValueHook(em, em.sourceMap);
  }

  const s2 = await registerBeforeHooks(em, em.sourceMap);
  const s3 = await registerAfterHooks(em, em.sourceMap);
  return s1 && s2 && s3;
}

// export async function spawnHardwareVM(
//   dm: DeviceManager,
//   wasmApp: string,
//   outputDir: string,
// ): Promise<MCUWARDuinoVM | undefined> {
//   const boards = await listAvailableBoards();
//   if (boards.length === 0) {
//     getGlobalLogger().error('No connected board detected');
//     return;
//   }
//   const boardPort = boards[0];
//   getGlobalLogger().info(`Using Board Port ${boardPort}`);
//   const fqbns = await listAllFQBN();
//   const targetBoardName = 'M5Stick-C';
//   const targetBoard = fqbns.find((board) => {
//     return board.boardName.includes(targetBoardName);
//   });

//   if (targetBoard === undefined) {
//     getGlobalLogger().error(`No board found with name ${targetBoardName}`);
//     return undefined;
//   }

//   const vmConfigArgs: VMConfigArgs = {
//     serialPort: boardPort,
//     program: wasmApp,
//   };

//   const deviceConfigArgs: DeviceIdentity = {
//     name: 'm5stickc',
//     deploymentMode: DeploymentMode.MCUVM,
//   };

//   const sl: ProgLangSelectionArgs = {
//     targetLanguage: TargetLanguage.WAT,
//     compilerArgs: wasmApp,
//   };
//   const platformConfig = new PlatformConfig(
//     PlatformTarget.Arduino,
//     BoardBaudRate.BD_115200,
//     targetBoard,
//     sl,
//     deviceConfigArgs,
//     vmConfigArgs,
//   );
//   return await dm.spawnHardwareVM(platformConfig, outputDir);
// }

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runMonitorApp(
  wasmApp: string,
  monitorTime: number,
  outputDir: string,
  nameOutputFile: string,
  monitorMode: PlatformTarget,
): Promise<boolean> {
  const bufferSizePriorWrite = 500;
  const JSONWriter = new WriteJSON(
    path.join(outputDir, nameOutputFile),
    bufferSizePriorWrite,
  );
  Brigadier = new BrigadierJSONWriter(JSONWriter);

  const dm = new DeviceManager();
  let vm: WasmitoBackendVM | undefined;
  const compilationArgs: WATCompilerArgs = {
    sourceCodePath: wasmApp,
  };

  if (monitorMode === PlatformTarget.DevVM) {
    const platform = await createDevPlatform({
      selectedLanguage: {
        targetLanguage: TargetLanguage.WAT,
      },
    });
    vm = await dm.spawnDevelopmentVM(platform, compilationArgs, 8000);
  } else if (monitorMode === PlatformTarget.Arduino) {
    const platform = await createArduinoPlatform({
      selectedLanguage: {
        targetLanguage: TargetLanguage.WAT,
      },
      vmConfig: {
        baudrate: BoardBaudRate.BD_115200,
        serialPort: '/dev/ttyUSB0',
        fqbn: {
          boardName: '',
          fqbn: 'esp32:esp32:m5stick-c',
        },
      },
    });
    vm = await dm.spawnHardwareVM(platform, compilationArgs);
    await sleep(5000); // sleep to let MCU load module first
  } else {
    getGlobalLogger().error(`unsupported mode ${monitorMode}`);
  }

  if (vm === undefined) {
    return false;
  }

  const registered = await registerAllHooks(
    vm,
    monitorMode === PlatformTarget.DevVM,
  );
  if (!registered) {
    return false;
  }

  await vm.run();
  setTimeout(() => {
    JSONWriter.close();
    exit(-1);
  }, monitorTime * 1000);
  return true;
}

const app = './src/tool_examples/wat_examples/dimmer-double-button.wat';
const recordTime = 30; // seconds
const outputDir = './example-wat/';
const nameMonitorOutputFile = 'monitor_m5stickc.json';
runMonitorApp(
  app,
  recordTime,
  outputDir,
  nameMonitorOutputFile,
  PlatformTarget.Arduino,
)
  .then((_) => {})
  .catch(console.error);
