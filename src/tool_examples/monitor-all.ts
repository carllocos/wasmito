import { parseDeviceConfig, DeviceMode } from '../device/device_config';
import { type EmulateDevice } from '../device/device_emulated';
import { DeviceManager } from '../device/device_manager';
import { getGlobalLogger } from '../logger/logger';
import { WASM } from '../state/wasm';
import { newTimeStamp } from '../instrumentor/timestamp';
import {
  ScheduleAfterTimeStamp,
  ScheduleBeforeTimeStamp,
} from '../instrumentor/schedule';
import {
  EmptyValueSubstitution,
  InspectState,
  ValueSubstitution,
  type WasmState,
} from '../instrumentor/action';
import {
  AroundFunctionRequest,
  isSuccessfulReply,
} from '../warduino/requests/around_function_request';
import {
  type MonitorWasmAddrResponse,
  MontiroWasmAddrRequest,
  MonitorMoment,
} from '../warduino/requests/monitor_request';
import { StateRequest } from '../warduino/requests/inspect_request';
import { ResponseType } from '../warduino/api/request_interface';
import { WATSourceMap } from '../language_parsers/wat_source_map';
import * as fs from 'fs';
import { type WasmOpcode } from '../language_parsers/opcodes';
import { PlaceholderType } from '../state/opcode_type';
import { exit } from 'process';

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

  public writeBefore(address: number, state: WasmState): void {
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
    };
    JSONWriter.write(content);
  }

  public writeAfter(address: number, state: WasmState): void {
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
        // if (result.type !== opcodeType.resultType) {
        // }
        results.push(state.stack[state.stack.length - 1].value);
      }

      const content = {
        op: opcode.name,
        labels,
        when: 'after',
        operands,
        result: results,
      };
      JSONWriter.write(content);
    }
  }
}

const JSONWriter = new WriteJSON('./example-wat/monitored.json', 500);
const Brigadier = new BrigadierJSONWriter(JSONWriter);

const dm = new DeviceManager();

export async function instrumentBlinkWasm(em: EmulateDevice): Promise<boolean> {
  const chipDelayIdx = 0;
  const requestChipDelay = new AroundFunctionRequest(chipDelayIdx);

  const chipPinMode = 1;
  const requestChipPinMode = new AroundFunctionRequest(chipPinMode);

  const chipDigitalWrite = 2;
  const requestChipDigWrite = new AroundFunctionRequest(chipDigitalWrite);
  const requests: AroundFunctionRequest[] = [
    requestChipDelay,
    requestChipPinMode,
    requestChipDigWrite,
  ];
  requests.forEach((req) => {
    req.addAction(new EmptyValueSubstitution());
  });
  const replies = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  let allSucess = true;
  replies.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
    allSucess = allSucess && isSuccessfulReply(reply);
  });
  return allSucess;
}

export async function instrumentTempWasm(em: EmulateDevice): Promise<boolean> {
  // (import "env" "chip_delay" (func $env.chip_delay (type $i32->void)))
  // (import "env" "chip_pin_mode" (func $env.chip_pin_mode (type $i32->i32->void)))
  // (import "env" "subscribe_interrupt" (func $env.subscribe_interrupt (type $i32->i32->i32->void)))
  // (import "env" "chip_ledc_setup" (func $env.chip_ledc_setup (type $i32->i32->i32->void)))
  // (import "env" "chip_ledc_attach_pin" (func $env.chip_ledc_attach_pin (type $i32->i32->void)))
  // (import "env" "chip_analog_write" (func $env.chip_analog_write (type $i32->i32->void)))
  // (import "env" "temperature"            (func $env.get_temperature     (type $void->f32)))

  const chipLedCSetup = 3;
  const emptyAction0 = new EmptyValueSubstitution().scheduleFor(
    new ScheduleBeforeTimeStamp(newTimeStamp(30, 0)),
  );
  const requestChipLedCSteup = new AroundFunctionRequest(
    chipLedCSetup,
  ).addAction(emptyAction0);

  const attachPinID = 4;

  const emptyAction = new EmptyValueSubstitution().scheduleFor(
    new ScheduleAfterTimeStamp(newTimeStamp(3, 0)),
  );
  const requestAttachPin = new AroundFunctionRequest(attachPinID).addAction(
    emptyAction,
  );

  const analogWriteID = 5;

  const emptyAction2 = new EmptyValueSubstitution().scheduleFor(
    new ScheduleAfterTimeStamp(newTimeStamp(23, 54)),
  );
  const requestAnalogWrite = new AroundFunctionRequest(analogWriteID).addAction(
    emptyAction2,
  );

  const tempID = 6;
  const value: WASM.Value = {
    type: WASM.Type.f32,
    value: 23.0004,
  };
  const requestTemp = new AroundFunctionRequest(tempID).addAction(
    new ValueSubstitution(value),
  );

  const requests = [
    requestTemp,
    requestAttachPin,
    requestAnalogWrite,
    requestChipLedCSteup,
  ];
  const replies = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  let allSucess = true;
  replies.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
    allSucess = allSucess && isSuccessfulReply(reply);
  });

  return allSucess;
}

export async function instrumentPrimitiveAlways(
  em: EmulateDevice,
): Promise<boolean> {
  const chipLedCSetup = 3;
  const emptyAction0 = new EmptyValueSubstitution();
  const requestChipLedCSteup = new AroundFunctionRequest(
    chipLedCSetup,
  ).addAction(emptyAction0);

  const attachPinID = 4;

  const emptyAction = new EmptyValueSubstitution();
  const requestAttachPin = new AroundFunctionRequest(attachPinID).addAction(
    emptyAction,
  );

  const analogWriteID = 5;

  const emptyAction2 = new EmptyValueSubstitution();
  const requestAnalogWrite = new AroundFunctionRequest(analogWriteID).addAction(
    emptyAction2,
  );

  const tempID = 6;
  const value: WASM.Value = {
    type: WASM.Type.f32,
    value: 23.0004,
  };
  const requestTemp = new AroundFunctionRequest(tempID).addAction(
    new ValueSubstitution(value),
  );

  const requests = [
    requestTemp,
    requestAttachPin,
    requestAnalogWrite,
    requestChipLedCSteup,
  ];
  const replies = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  let allSucess = true;
  replies.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
    allSucess = allSucess && isSuccessfulReply(reply);
  });
  return true;
}

export function onMonitoredState(d: WasmState): void {
  const vals = d.stack ?? [];
  const s = vals
    .map((v) => {
      return `{"idx":${v.idx},"type":${v.type},"value":${v.value}}`;
    })
    .join(', ');
  getGlobalLogger().info(`addr=${d.pc} stack=[${s}]`);
}

export async function instrumentForMonitor(
  em: EmulateDevice,
): Promise<boolean> {
  // const funcAddresses = [344, 269, 275, 348, 339, 356, 358, 360];
  // const stateRequest = new StateRequest();
  // stateRequest.includeStack().includeGlobals().includePC();
  // const requestsBefore = funcAddresses.map((addr) => {
  //   const inspectAction = new InspectState(stateRequest, addr);
  //   inspectAction.onSubscriptionData = onMonitoredState;
  //   return new MontiroWasmAddrRequest(addr).before().addAction(inspectAction);
  // });
  // const repliesBefore = await Promise.all(
  //   requestsBefore.map(async (req) => {
  //     return await em.sendRequest(req);
  //   }),
  // );
  // repliesBefore.forEach((reply) => {
  //   getGlobalLogger().debug(
  //     `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
  //   );
  // });
  return true;
}

export function createOnMonitorAfterState(nameOpcode: string, addr: number) {
  return (state: WasmState) => {
    const vals = state.stack ?? [];
    const s = vals
      .map((v) => {
        return `{"idx":${v.idx},"type":${v.type},"value":${v.value}}`;
      })
      .join(', ');
    getGlobalLogger().info(
      `after ${nameOpcode} addr=${addr}(0x${addr.toString(16)}) (new pc addr=${
        state.pc
      }) stack(#${state.stack?.length} elements)=[${s}]`,
    );
  };
}

export function createOnMonitorBeforeState(nameOpcode: string, addr: number) {
  return (state: WasmState) => {
    const vals = state.stack ?? [];
    const s = vals
      .map((v) => {
        return `{"idx":${v.idx},"type":${v.type},"value":${v.value}}`;
      })
      .join(', ');
    getGlobalLogger().info(
      `before ${nameOpcode} addr=${addr}(0x${addr.toString(16)}) stack(#${state
        .stack?.length} elements)=[${s}]`,
    );
  };
}

export async function monitorGlobalGet(em: EmulateDevice): Promise<boolean> {
  const addresses = [271, 346, 335, 350, 311, 313, 320, 327, 362]; // global.get

  const beforeMonitoring = addresses.map((addr) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const inspectStack = new InspectState(inspectStackRequest, addr);
    inspectStack.onSubscriptionData = createOnMonitorBeforeState(
      'global.get',
      addr,
    );
    return new MontiroWasmAddrRequest(addr).before().addAction(inspectStack);
  });
  const repliesBefore = await Promise.all(
    beforeMonitoring.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  repliesBefore.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
  });

  const afterMonitoring = addresses.map((addr) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const inspectStack = new InspectState(inspectStackRequest, addr);
    inspectStack.onSubscriptionData = createOnMonitorAfterState(
      'global.get',
      addr,
    );
    return new MontiroWasmAddrRequest(addr).after().addAction(inspectStack);
  });
  const repliesAfter = await Promise.all(
    afterMonitoring.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  repliesAfter.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
  });
  return true;
}

export async function monitorFuncCalls(em: EmulateDevice): Promise<boolean> {
  // hexa addr    = ['0x158', '0x10d', '0x113', '0x15c', '0x153', '0x160', '0x164', '0x166', '0x168', '0x16c']
  const addresses = [344, 269, 275, 348, 339, 352, 356, 358, 360, 364]; // call

  const beforeMonitoring = addresses.map((addr) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const inspectStack = new InspectState(inspectStackRequest, addr);
    inspectStack.onSubscriptionData = createOnMonitorBeforeState('call', addr);
    return new MontiroWasmAddrRequest(addr).before().addAction(inspectStack);
  });
  const repliesBefore = await Promise.all(
    beforeMonitoring.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  repliesBefore.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
  });

  const afterMonitoring = addresses.map((addr) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const inspectStack = new InspectState(inspectStackRequest, addr);
    inspectStack.onSubscriptionData = createOnMonitorAfterState('call', addr);
    return new MontiroWasmAddrRequest(addr).after().addAction(inspectStack);
  });
  const repliesAfter = await Promise.all(
    afterMonitoring.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  repliesAfter.forEach((reply) => {
    getGlobalLogger().debug(
      `Got reply interrupt=${reply.interrupt} responseType=${reply.responseType} error_code?=${reply.error_code}`,
    );
  });
  return true;
}
export function allSucceeded(replies: MonitorWasmAddrResponse[]): boolean {
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

export function logReplies(replies: MonitorWasmAddrResponse[]): void {
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

export async function monitorTestExample(em: EmulateDevice): Promise<boolean> {
  const funcName0 = 'func_block_return';
  const opcodesFunBlockRet = [
    ['block', 96],
    ['return', 104],
    ['end', 106],
  ];
  const afterFunc0 = opcodesFunBlockRet.map((pair) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const addr = pair[1] as number;
    let opcode = pair[0] as string;
    opcode = `${funcName0} ${opcode}`;
    const inspectStack = new InspectState(inspectStackRequest);
    inspectStack.onSubscriptionData = createOnMonitorAfterState(opcode, addr);
    return new MontiroWasmAddrRequest(addr).after().addAction(inspectStack);
  });

  const r1 = await Promise.all(
    afterFunc0.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(r1);

  const funcName1 = 'func_nested_return';
  const opcodesFuncNestedRet = [
    ['call', 204],
    ['block', 109],
    ['block', 113],
    ['return', 118],
    ['end', 122],
  ];

  const afterFunc1 = opcodesFuncNestedRet.map((pair) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const addr = pair[1] as number;
    let opcode = pair[0] as string;
    opcode = `${funcName1} ${opcode}`;
    const inspectStack = new InspectState(inspectStackRequest);
    inspectStack.onSubscriptionData = createOnMonitorAfterState(opcode, addr);
    return new MontiroWasmAddrRequest(addr).after().addAction(inspectStack);
  });

  const r2 = await Promise.all(
    afterFunc1.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(r2);

  const funcName2 = 'func_loop';
  const opcodesFunLoop = [
    ['call', 206],
    ['loop', 131],
    ['if', 143],
    ['br', 147],
    ['return', 145],
    ['end', 150],
  ];

  const afterFunc2 = opcodesFunLoop.map((pair) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const addr = pair[1] as number;
    let opcode = pair[0] as string;
    opcode = `${funcName2} ${opcode}`;
    const inspectStack = new InspectState(inspectStackRequest);
    inspectStack.onSubscriptionData = createOnMonitorAfterState(opcode, addr);
    return new MontiroWasmAddrRequest(addr).after().addAction(inspectStack);
  });

  const r3 = await Promise.all(
    afterFunc2.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(r3);

  const funcName3 = 'func_switch_like';
  const opcodesFuncSwitch = [
    ['call', 194],
    ['block', 153],
    ['block', 155],
    ['block', 157],
    ['block', 159],
    ['br_table', 163],
    ['end', 184], // end of first block
    ['return', 188],
    ['end', 189],
  ];
  const afterFunc3 = opcodesFuncSwitch.map((pair) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const addr = pair[1] as number;
    let opcode = pair[0] as string;
    opcode = `${funcName3} ${opcode}`;
    const inspectStack = new InspectState(inspectStackRequest);
    inspectStack.onSubscriptionData = createOnMonitorAfterState(opcode, addr);
    return new MontiroWasmAddrRequest(addr).after().addAction(inspectStack);
  });

  const r4 = await Promise.all(
    afterFunc3.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(r4);

  const funcNameIndCall = 'indirect_call';
  const opcodesIndCall = [
    ['call_indirect', 221],
    ['end', 197],
  ];

  const afterIndCall = opcodesIndCall.map((pair) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const addr = pair[1] as number;
    let opcode = pair[0] as string;
    opcode = `${funcNameIndCall} ${opcode}`;
    const inspectStack = new InspectState(inspectStackRequest);
    inspectStack.onSubscriptionData = createOnMonitorAfterState(opcode, addr);
    return new MontiroWasmAddrRequest(addr).after().addAction(inspectStack);
  });

  const funcNameMain = 'func_main';
  const opcodesFunMain = [
    ['if', 210], // if of main
    ['else', 214], // else of main
    ['end', 217], // end of else of main
    ['br', 224],
  ];

  const r5 = await Promise.all(
    afterIndCall.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(r5);

  const afterMain = opcodesFunMain.map((pair) => {
    const inspectStackRequest = new StateRequest().includeStack();
    const addr = pair[1] as number;
    let opcode = pair[0] as string;
    opcode = `${funcNameMain} ${opcode}`;
    const inspectStack = new InspectState(inspectStackRequest);
    inspectStack.onSubscriptionData = createOnMonitorAfterState(opcode, addr);
    return new MontiroWasmAddrRequest(addr).after().addAction(inspectStack);
  });

  const r6 = await Promise.all(
    afterMain.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );
  logReplies(r6);

  return (
    allSucceeded(r1) &&
    allSucceeded(r2) &&
    allSucceeded(r3) &&
    allSucceeded(r4) &&
    allSucceeded(r5) &&
    allSucceeded(r6)
  );
}

export function createJSONWriter(
  address: number,
  opcode: WasmOpcode,
  when: MonitorMoment,
): (state: WasmState) => void {
  if (when === MonitorMoment.MonitorBefore) {
    Brigadier.addBefore(address, opcode);
  } else {
    Brigadier.addAfter(address, opcode);
  }
  return (state: WasmState) => {
    if (when === MonitorMoment.MonitorBefore) {
      Brigadier.writeBefore(address, state);
    } else {
      Brigadier.writeAfter(address, state);
    }
  };
}

export async function monitorAllOpcodes(
  em: EmulateDevice,
  app: string,
): Promise<boolean> {
  const sourceMap = await WATSourceMap.fromPath(app);
  if (sourceMap === undefined) {
    return false;
  }

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
  const requests = funcs.map((f) => {
    const emptyAction0 = new EmptyValueSubstitution();
    const fId = f?.id === undefined ? 0 : f.id;
    return new AroundFunctionRequest(fId).addAction(emptyAction0);
  });
  const repliesAround = await Promise.all(
    requests.map(async (req) => {
      return await em.sendRequest(req);
    }),
  );

  logReplies(repliesAround);
  if (!allSucceeded(repliesAround)) {
    return false;
  }

  const opcodesBeforeRequests = sourceMap.opcodes().map((pair) => {
    const inspectStackRequest = new StateRequest().includeStack().includePC();
    const inspectStack = new InspectState(inspectStackRequest);
    inspectStack.onSubscriptionData = createJSONWriter(
      pair.address,
      pair.opcode,
      MonitorMoment.MonitorBefore,
    );
    return new MontiroWasmAddrRequest(pair.address)
      .before()
      .addAction(inspectStack);
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
  const opcodesAfterRequests = sourceMap.opcodes().map((pair) => {
    const inspectStackRequest = new StateRequest().includeStack().includePC();
    const inspectStack = new InspectState(inspectStackRequest);
    inspectStack.onSubscriptionData = createJSONWriter(
      pair.address,
      pair.opcode,
      MonitorMoment.MonitorAfter,
    );
    return new MontiroWasmAddrRequest(pair.address)
      .after()
      .addAction(inspectStack);
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

  setTimeout(() => {
    JSONWriter.close();
    exit(-1);
  }, 35 * 1000);
  return true;
}

export async function createEmulator(
  wasmApp: string,
): Promise<EmulateDevice | undefined> {
  const dc = parseDeviceConfig({
    program: wasmApp,
    mode: DeviceMode.Emulate,
    port: '8300',
    id: '1',
    name: 'emulator',
  });
  if (dc !== undefined) {
    const em = await dm.connectToExitingEmulator(dc, 8000);

    // const em = await dm.spawnEmulator(dc, 8000);
    // const success = await instrumentTempWasm(em);
    // if (!(await instrumentPrimitiveAlways(em))) {
    //   return;
    // }
    // if (await monitorTestExample(em)) {
    //   await em.run();
    // }

    if (await monitorAllOpcodes(em, app)) {
      await em.run();
    }
    return em;
  }
}

const app = './example-wat/test-example.diss';
createEmulator(app)
  .then((_) => {})
  .catch(console.error);
// const dimApp =
//   '/home/carllocos/Projects/WARDuino-fork/examples/wat/main/dim-using-temperature.wasm';
// // const blinkApp =
// //   '/home/carllocos/Projects/WARDuino-fork/examples/wat/main/blink.wasm';
