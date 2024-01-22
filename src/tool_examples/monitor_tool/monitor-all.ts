import {
  DeploymentMode,
  type DeviceConfigArgs,
} from '../../device/device_config';
import { DeviceManager } from '../../device/device_manager';
import { getGlobalLogger } from '../../logger/logger';
import { type WasmState } from '../../state/wasm';
import { InspectStateHook } from '../../hooks/hook_inspect_state';
import { EmptyValueSubstitution } from '../../hooks/hook_value_substitution';
import { AroundFunctionRequest } from '../../warduino/requests/around_function_request';
import {
  type HookOnWasmAddrResponse,
  HookOnWasmAddrRequest,
  HoonOnWasmAddrMoment,
} from '../../warduino/requests/hook_on_wasm_addr_request';
import { StateRequest } from '../../warduino/requests/inspect_request';
import { ResponseType } from '../../warduino/api/request_interface';
import * as fs from 'fs';
import { type WasmOpcode } from '../../source_mappers/wat/opcodes';
import { PlaceholderType } from '../../state/opcode_type';
import { exit } from 'process';
import { type WARDuinoVM } from '../../warduino/vm/warduino_vm';
import { type SourceMap } from '../../source_mappers/source_map';
import path from 'path';
import { type MCUWARDuinoVM } from '../../warduino/vm/mcu_vm';
import { listAllFQBN, listAvailableBoards } from '../../builder/util_platform';
import { Platform, PlatformBuilderConfig } from '../../builder/platform_config';
import { BoardBaudRate } from '../../util/serial_port';
import { type VMConfigArgs } from '../../device/vm_config';

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
  private readonly befores: Map<number, [number, WasmOpcode, string, number[]]>;
  private readonly after: Map<number, [WasmOpcode, string]>;

  constructor(writer: WriteJSON) {
    this.writer = writer;
    this.befores = new Map();
    this.after = new Map();
  }

  public addBefore(addr: number, opcode: WasmOpcode): void {
    this.befores.set(addr, [addr, opcode, opcode.getLabels().join(' '), []]);
  }

  public addAfter(addr: number, opcode: WasmOpcode): void {
    this.after.set(addr, [opcode, opcode.getLabels().join(' ')]);
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
    const opcodeType = opcode.getType();
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
          `Stack contains insufficient values for to be used as arguments for opcode ${
            opcode.name
          } ${labels}. Opcode expects #${
            opcode.getType().nrArgs
          } stack has size #${state.stack.length}`,
        );
      } else if (opcodeType.nrArgs > 0) {
        const ops = state.stack.slice(
          state.stack.length - opcode.getType().nrArgs,
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

    const opcodeType = opcode.getType();
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
  opcode: WasmOpcode,
  when: HoonOnWasmAddrMoment,
): (state: WasmState) => void {
  if (Brigadier === undefined) {
    throw new Error('set Brigadier first');
  }
  if (when === HoonOnWasmAddrMoment.HookBefore) {
    Brigadier.addBefore(address, opcode);
  } else {
    Brigadier.addAfter(address, opcode);
  }
  return (state: WasmState) => {
    if (when === HoonOnWasmAddrMoment.HookBefore) {
      Brigadier?.writeBefore(address, linenr, columnStart, columnEnd, state);
    } else {
      Brigadier?.writeAfter(address, linenr, columnStart, columnEnd, state);
    }
  };
}

async function registerSubstitueValueHook(
  em: WARDuinoVM,
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
  em: WARDuinoVM,
  sourceMap: SourceMap,
): Promise<boolean> {
  const opcodesBeforeRequests = sourceMap
    .mappings()
    .map(({ address, linenr, columnStart, columnEnd, opcode }) => {
      const inspectStackRequest = new StateRequest().includeStack().includePC();
      const inspectStack = new InspectStateHook(inspectStackRequest);
      inspectStack.onSubscriptionData = createJSONWriter(
        address,
        linenr,
        columnStart,
        columnEnd,
        opcode,
        HoonOnWasmAddrMoment.HookBefore,
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
  em: WARDuinoVM,
  sourceMap: SourceMap,
): Promise<boolean> {
  const opcodesAfterRequests = sourceMap
    .mappings()
    .map(({ address, linenr, columnStart, columnEnd, opcode }) => {
      const inspectStackRequest = new StateRequest().includeStack().includePC();
      const inspectStack = new InspectStateHook(inspectStackRequest);
      inspectStack.onSubscriptionData = createJSONWriter(
        address,
        linenr,
        columnStart,
        columnEnd,
        opcode,
        HoonOnWasmAddrMoment.HookAfter,
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
  em: WARDuinoVM,
  registerSubstitue: boolean,
): Promise<boolean> {
  const sourceMap = em.getSourceMap();
  if (sourceMap === undefined) {
    return false;
  }

  let s1 = true;
  if (registerSubstitue) {
    s1 = await registerSubstitueValueHook(em, sourceMap);
  }

  const s2 = await registerBeforeHooks(em, sourceMap);
  const s3 = await registerAfterHooks(em, sourceMap);
  return s1 && s2 && s3;
}

export async function spawnHardwareVM(
  dm: DeviceManager,
  wasmApp: string,
  outputDir: string,
): Promise<MCUWARDuinoVM | undefined> {
  const boards = await listAvailableBoards();
  if (boards.length === 0) {
    getGlobalLogger().error('No connected board detected');
    return;
  }
  const boardPort = boards[0];
  getGlobalLogger().info(`Using Board Port ${boardPort}`);
  const fqbns = await listAllFQBN();
  const targetBoardName = 'M5Stick-C';
  const targetBoard = fqbns.find((board) => {
    return board.boardName.includes(targetBoardName);
  });

  if (targetBoard === undefined) {
    getGlobalLogger().error(`No board found with name ${targetBoardName}`);
    return undefined;
  }

  const vmConfigArgs: VMConfigArgs = {
    serialPort: boardPort,
    program: wasmApp,
  };

  const deviceConfigArgs: DeviceConfigArgs = {
    name: 'm5stickc',
    deploymentMode: DeploymentMode.MCUVM,
  };

  const platformConfig = new PlatformBuilderConfig(
    Platform.Arduino,
    BoardBaudRate.BD_115200,
    targetBoard,
    deviceConfigArgs,
    vmConfigArgs,
  );
  const mcuVM = await dm.spawnHardwareVM(platformConfig, outputDir);
  const uploaded = await mcuVM.uploadSourceCode(wasmApp);
  if (!uploaded) {
    return undefined;
  }
  return mcuVM;
}

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
  monitorMode: DeploymentMode,
): Promise<boolean> {
  const bufferSizePriorWrite = 500;
  const JSONWriter = new WriteJSON(
    path.join(outputDir, nameOutputFile),
    bufferSizePriorWrite,
  );
  Brigadier = new BrigadierJSONWriter(JSONWriter);

  const dm = new DeviceManager();
  let vm: WARDuinoVM | undefined;
  if (monitorMode === DeploymentMode.DevVM) {
    const vmConfigArgs: VMConfigArgs = {
      program: wasmApp,
      disableStrictModuleLoad: true,
    };

    const vmName = undefined;
    vm = await dm.spawnDevelopmentVM(vmConfigArgs, 8000, vmName, outputDir);
  } else if (monitorMode === DeploymentMode.MCUVM) {
    vm = await spawnHardwareVM(dm, wasmApp, outputDir);
    await sleep(5000); // sleep to let MCU load module first
  } else {
    getGlobalLogger().error(`unsupported mode ${monitorMode}`);
  }

  if (vm === undefined) {
    return false;
  }

  const registered = await registerAllHooks(
    vm,
    monitorMode === DeploymentMode.DevVM,
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

const app = './example-wat/dimmer-double-button.wat';
const recordTime = 30; // seconds
const outputDir = './example-wat/';
const nameMonitorOutputFile = 'monitor_m5stickc.json';
runMonitorApp(
  app,
  recordTime,
  outputDir,
  nameMonitorOutputFile,
  DeploymentMode.DevVM,
)
  .then((_) => {})
  .catch(console.error);
