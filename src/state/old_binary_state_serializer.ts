/*
 * THE FOLLOWING CODE NEEDS TO BE SERIOUSLY REFACTORED!!!
 */

import { createLogger } from '../logger/logger';
import { Instruction } from '../warduino/api/instructions';
import { InspectableState } from '../warduino/requests/inspect_request';
import { WASM, type WASMValueIndexed, type WasmState } from './wasm';
const logger = createLogger('BinaryEncoder');

function HexaEncoderSerializeUInt8(n: number): string {
  return HexaEncoderSerializeUInt(n, 1, true);
}

function HexaEncoderSerializeUInt16BE(n: number): string {
  return HexaEncoderSerializeUInt(n, 2, true);
}

function HexaEncoderSerializeUInt32BE(n: number): string {
  return HexaEncoderSerializeUInt(n, 4, true);
}

function HexaEncoderSerializeInt32LE(n: number): string {
  return HexaEncoderSerializeUInt(n, 4, false);
}

function HexaEncoderSerializeUInt32LE(n: number): string {
  return HexaEncoderSerializeUInt(n, 4, false);
}

// function HexaEncoderSerializeBigUInt64LE(n: bigint): string {
//   return HexaEncoderSerializeBigUInt64(n, false);
// }

// function HexaEncoderSerializeBigUInt64BE(n: bigint): string {
//   return HexaEncoderSerializeBigUInt64(n, true);
// }

// function HexaEncoderSerializeBigUInt64(n: bigint, bigendian: boolean): string {
//   const buff = Buffer.allocUnsafe(8);
//   if (bigendian) {
//     buff.writeBigUInt64BE(n);
//   } else {
//     buff.writeBigUInt64LE(n);
//   }
//   return buff.toString('hex');
// }

function HexaEncoderSerializeUInt(
  n: number,
  amountBytes: number,
  bigendian: boolean,
): string {
  const buff = Buffer.allocUnsafe(amountBytes);
  if (amountBytes === 1) {
    if (n < 0) {
      buff.writeInt8(n);
    } else {
      buff.writeUInt8(n);
    }
  } else if (amountBytes === 2) {
    if (bigendian) {
      if (n < 0) {
        buff.writeUInt16BE(n);
      } else {
        buff.writeUInt16BE(n);
      }
    } else {
      if (n < 0) {
        buff.writeInt16LE(n);
      } else {
        buff.writeUInt16LE(n);
      }
    }
  } else if (amountBytes === 4) {
    if (bigendian) {
      if (n < 0) {
        buff.writeInt32BE(n);
      } else {
        buff.writeUInt32BE(n);
      }
    } else {
      if (n < 0) {
        buff.writeInt32LE(n);
      } else {
        buff.writeUInt32LE(n);
      }
    }
  } else {
    throw new Error('invalid amount of bytes');
  }
  return buff.toString('hex');
}

function HexaEncoderSerializeInt32(n: number, bigendian: boolean): string {
  const buff = Buffer.allocUnsafe(4);
  if (bigendian) {
    buff.writeInt32BE(n);
  } else {
    buff.writeUInt32LE(n);
  }
  return buff.toString('hex');
}

// function HexaEncoderSerializeFloatBE(n: number): string {
//   return HexaEncoderSerializeFloat(n, true);
// }

function HexaEncoderSerializeFloatLE(n: number): string {
  return HexaEncoderSerializeFloat(n, false);
}

function HexaEncoderSerializeFloat(n: number, bigendian: boolean): string {
  const buff = Buffer.allocUnsafe(4);
  if (bigendian) {
    buff.writeFloatBE(n);
  } else {
    buff.writeFloatLE(n);
  }
  return buff.toString('hex');
}

// function HexaEncoderSerializeDoubleBE(n: number): string {
//   return HexaEncoderSerializeDouble(n, true);
// }

function HexaEncoderSerializeDoubleLE(n: number): string {
  return HexaEncoderSerializeDouble(n, false);
}

function HexaEncoderSerializeDouble(n: number, bigendian: boolean): string {
  const buff = Buffer.allocUnsafe(8);
  if (bigendian) {
    buff.writeDoubleBE(n);
  } else {
    buff.writeDoubleLE(n);
  }
  return buff.toString('hex');
}

function HexaEncoderSerializeString(s: string): string {
  return s
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

class HexaStateMessages {
  private readonly maxMessageSize: number;
  private messages: string[];
  private readonly maxPayloadSize: number;
  private currentMsg: string;

  // Header data
  private readonly nrBytesForPayloadSize = 4 * 2; // tells how big the payload is. Times 2 for hexa
  private readonly nrBytesForInterruptKind = Instruction.LoadSnapshot.length; // already in hexa

  private readonly headerSize: number;

  // Footer data
  private readonly nrBytesForContinuation = 1 * 2; // 1 byte to tell whether all state is transferred. Times 2 for hexa
  private readonly terminatorChar = ' \n';
  private readonly footerSize: number;

  constructor(messageSize: number) {
    this.maxMessageSize = messageSize;
    this.messages = [];
    this.currentMsg = '';
    this.headerSize = this.nrBytesForInterruptKind + this.nrBytesForPayloadSize;
    this.footerSize = this.nrBytesForContinuation + this.terminatorChar.length;
    this.maxPayloadSize =
      this.maxMessageSize - this.headerSize - this.footerSize;
  }

  public enoughSpace(spaceNeeded: number): boolean {
    return this.getFreeSpace() >= spaceNeeded;
  }

  public howManyFit(headerSize: number, payloads: string[]): number {
    let amount = 0;
    let payload: string = '';
    for (let i = 0; i < payloads.length; i++) {
      payload += payloads[i];
      if (!this.enoughSpace(payload.length + headerSize)) {
        break;
      }
      amount++;
    }
    return amount;
  }

  private validatePayload(payload: string): void {
    if (this.maxPayloadSize < payload.length) {
      let errmsg = `Payload size exceeds maxPayload Size of ${this.maxPayloadSize}`;
      errmsg += `(= maxMessageSize ${this.maxMessageSize} - header/footer ${
        this.headerSize + this.footerSize
      }).`;
      errmsg += 'Either increase maxMessageSize or split payload.';
      throw new Error(errmsg);
    }
    if (payload.length % 2 !== 0) {
      throw new Error(
        `Payload is not even. Got length ${this.currentMsg.length}`,
      );
    }
    const regexHexa = /^[0-9A-Fa-f]+$/g;
    const matched = payload.match(regexHexa);
    if (matched === null) {
      throw new Error(
        `Payload should only contain hexa chars. Given ${payload}`,
      );
    }
  }

  public getFreeSpace(): number {
    return this.maxPayloadSize - this.currentMsg.length;
  }

  public addPayload(payload: string): void {
    this.validatePayload(payload);
    if (!this.enoughSpace(payload.length)) {
      this.forceNewMessage();
    }
    this.currentMsg = `${this.currentMsg}${payload}`;
    const s = this.currentMsg.length + this.headerSize + this.footerSize;
    if (s > this.maxMessageSize) {
      throw new Error(`Exceeded max size is ${s} > ${this.maxMessageSize}`);
    }
  }

  public forceNewMessage(): void {
    this.messages.push(this.currentMsg);
    this.currentMsg = '';
  }

  public getMessages(): string[] {
    if (this.currentMsg !== '') {
      this.messages = this.messages.concat(this.currentMsg);
      this.currentMsg = '';
    }

    const amountMessages = this.messages.length;
    const lastChar = this.terminatorChar;
    return this.messages.map((payload, msgIdx) => {
      const size = Math.floor(payload.length / 2);
      const sizeHexa = HexaEncoderSerializeUInt32BE(size);
      const done = msgIdx + 1 === amountMessages ? '01' : '00';
      const msg = `${Instruction.LoadSnapshot}${sizeHexa}${payload}${done}${lastChar}`;
      if (msg.length % 2 !== 0) {
        throw new Error('WoodState: Hexa message not even');
      }
      if (msg.length > this.maxMessageSize) {
        throw new Error(
          `msg ${msgIdx} is ${msg.length} > ${this.maxMessageSize}`,
        );
      }
      return msg;
    });
  }
}

export class StateBinaryEncoder {
  private readonly wasmState: WasmState;
  constructor(wasmState: WasmState) {
    this.wasmState = wasmState;
  }

  toBinary(maxInterruptSize: number = 1024): string[] {
    const stateMessages = new HexaStateMessages(maxInterruptSize);

    // Allocation Message
    this.serialiseAllocationMessage(stateMessages);
    stateMessages.forceNewMessage();

    // State Messages
    this.serializePC(stateMessages);
    this.serializeBPs(stateMessages);
    this.serializeStack(stateMessages);
    this.serializeTable(stateMessages);
    this.serializeCallstack(stateMessages);
    this.serializeGlobals(stateMessages);
    this.serializeCallbacksMapping(stateMessages);
    this.serializeMemory(stateMessages);
    this.serializeBrTable(stateMessages);

    return stateMessages.getMessages();
  }

  // Helper methods

  private serializeBPs(stateMsgs: HexaStateMessages): void {
    // |      Header       |        Breakpoints
    // | BPState  | Nr BPS |     BP1          | BP2 | ...
    // |  2 bytes |   1*2  | serializePointer |
    if (this.wasmState.breakpoints === undefined) {
      return;
    }
    logger.debug('breakpoints');
    const nrBytesUsedForAmountBPs = 1 * 2;
    const headerSize =
      InspectableState.breakpointState.length + nrBytesUsedForAmountBPs;
    let breakpoints = this.wasmState.breakpoints.map((bp) => {
      return this.serializePointer(bp);
    });
    while (breakpoints.length !== 0) {
      const fits = stateMsgs.howManyFit(headerSize, breakpoints);
      if (fits === 0) {
        stateMsgs.forceNewMessage();
        continue;
      }
      const bps = breakpoints.slice(0, fits).join('');
      const amountBPs = HexaEncoderSerializeUInt8(fits);
      logger.debug(`Breakpoints amount=${breakpoints.length}`);
      const payload = `${InspectableState.breakpointState}${amountBPs}${bps}`;
      stateMsgs.addPayload(payload);
      breakpoints = breakpoints.slice(fits, breakpoints.length);
    }
  }

  private serializeStack(stateMsgs: HexaStateMessages): void {
    // |          Header           |       StackValues
    // | StackState | Nr StackVals |     V1         | V2 | ...
    // |  2 bytes   |      2*2     | serializeValue |
    if (this.wasmState.stack === undefined) {
      return;
    }
    logger.debug(`Stack (length=${this.wasmState.stack.length}`);

    let stack = this.wasmState.stack.map((v) => {
      return StateBinaryEncoder.serializeValue(v);
    });
    const nrBytesUsedForAmountVals = 2 * 2;
    const headerSize =
      InspectableState.stackState.length + nrBytesUsedForAmountVals;
    while (stack.length !== 0) {
      const fit = stateMsgs.howManyFit(headerSize, stack);
      if (fit === 0) {
        stateMsgs.forceNewMessage();
      }
      const amountVals = HexaEncoderSerializeUInt16BE(fit);
      const vals = stack.slice(0, fit).join('');
      const payload = `${InspectableState.stackState}${amountVals}${vals}`;
      stateMsgs.addPayload(payload);
      stack = stack.slice(fit, stack.length);
      logger.debug(`AmountStackValues ${fit}`);
    }
  }

  private serializeTable(stateMsgs: HexaStateMessages): void {
    // |          Header          |       Elements
    // | TableState | Nr Elements |    elem  1  | elem 2 | ...
    // |  2 bytes   |   4*2       |  4*2 bytes  |
    if (this.wasmState.table === undefined) {
      return;
    }
    let elements = this.wasmState.table.elements.map(
      HexaEncoderSerializeUInt32BE,
    );
    logger.debug(`Table (size ${this.wasmState.table.elements.length}`);
    const nrBytesUsedForAmountElements = 4 * 2;
    const headerSize =
      InspectableState.tableState.length + nrBytesUsedForAmountElements;
    while (elements.length !== 0) {
      const fit = stateMsgs.howManyFit(headerSize, elements);
      if (fit === 0) {
        stateMsgs.forceNewMessage();
        continue;
      }
      const amountElements = HexaEncoderSerializeUInt32BE(fit);
      const elems = elements.slice(0, fit).join('');
      const elStr = this.wasmState.table.elements
        .slice(0, fit)
        .map((e) => e.toString())
        .join(', ');
      logger.debug(`msg: amountElements ${fit} elements ${elStr}`);
      const payload = `${InspectableState.tableState}${amountElements}${elems}`;
      stateMsgs.addPayload(payload);
      elements = elements.slice(fit, elements.length);
    }
  }

  private serializeCallstack(stateMsgs: HexaStateMessages): void {
    // |           Header           |              Frames
    // | CallstackState | Nr Frames |   Frame 1      | Frame 2 | ...
    // |    2 bytes     |  2*2bytes | serializeFrame |
    if (this.wasmState.callstack === undefined) {
      return;
    }
    logger.debug(`Callstack Total Frames ${this.wasmState.callstack.length}`);

    let frames = this.wasmState.callstack.map((f) => {
      return this.serializeFrame(f);
    });
    const nrBytesUsedForAmountFrames = 2 * 2;
    const headerSize =
      InspectableState.callstackState.length + nrBytesUsedForAmountFrames;
    while (frames.length !== 0) {
      const fit = stateMsgs.howManyFit(headerSize, frames);
      if (fit === 0) {
        stateMsgs.forceNewMessage();
        continue;
      }
      const amountFrames = HexaEncoderSerializeUInt16BE(fit);
      const fms = frames.slice(0, fit).join('');

      logger.debug(` amountFrames=${fit}`);
      const payload = `${InspectableState.callstackState}${amountFrames}${fms}`;
      stateMsgs.addPayload(payload);
      frames = frames.slice(fit, frames.length);
    }
  }

  private serializeGlobals(stateMsgs: HexaStateMessages): void {
    // |        Header          |       Globals
    // | GlobalState |  Nr Vals |     V1         | V2 | ...
    // |  2 bytes    | 4*2bytes | serializeValue |
    if (this.wasmState.globals === undefined) {
      return;
    }
    logger.debug(`Total Globals ${this.wasmState.globals.length}`);
    let globals = this.wasmState.globals.map((v) => {
      return StateBinaryEncoder.serializeValue(v);
    });
    const nrBytesNeededForAmountGlbs = 4 * 2;
    const headerSize =
      InspectableState.globalsState.length + nrBytesNeededForAmountGlbs;
    while (globals.length !== 0) {
      const fit = stateMsgs.howManyFit(headerSize, globals);
      if (fit === 0) {
        stateMsgs.forceNewMessage();
        continue;
      }
      const amountGlobals = HexaEncoderSerializeUInt32BE(fit);
      const glbs = globals.slice(0, fit).join('');
      const payload = `${InspectableState.globalsState}${amountGlobals}${glbs}`;
      stateMsgs.addPayload(payload);
      globals = globals.slice(fit, globals.length);

      logger.debug(`msg: AmountGlobals ${fit}`);
    }
  }

  private serializeMemory(stateMsgs: HexaStateMessages): void {
    // |        Header                          | Memory Bytes
    // | MemState | Mem Start Idx | Mem End Idx |  byte 1   | byte 2|
    // |  2 bytes |    4*2 bytes  |  4*2 bytes  | 1*2 bytes | ....
    if (this.wasmState.memory === undefined) {
      return;
    }
    logger.debug('Memory');
    const sizeHeader = InspectableState.memState.length + 4 * 2 + 4 * 2;
    let bytes = Array.from(this.wasmState.memory.bytes).map((b) =>
      b.toString(16).padStart(2, '0'),
    );

    logger.debug(`Total Memory Bytes ${this.wasmState.memory.bytes.length}`);
    let startMemIdx = 0;
    let endMemIdx = 0;
    while (bytes.length !== 0) {
      const fit = stateMsgs.howManyFit(sizeHeader, bytes);
      if (fit === 0) {
        stateMsgs.forceNewMessage();
        continue;
      }
      endMemIdx = startMemIdx + fit - 1;
      const bytesHexa = bytes.slice(0, fit).join('');
      const startMemIdxHexa = HexaEncoderSerializeUInt32BE(startMemIdx);
      const endMemIdxHexa = HexaEncoderSerializeUInt32BE(endMemIdx);
      const payload = `${InspectableState.memState}${startMemIdxHexa}${endMemIdxHexa}${bytesHexa}`;
      stateMsgs.addPayload(payload);
      startMemIdx = endMemIdx + 1;

      bytes = bytes.slice(fit, bytes.length);
    }
  }

  private serializeBrTable(stateMsgs: HexaStateMessages): void {
    // |                    Header           |        Labels
    // | BR_TblState |  StartIdx |  EndIdx   | label 1   | label 2|
    // |  2 bytes    | 2*2 bytes | 2*2 bytes | 4*2 bytes | ....
    if (this.wasmState.br_table === undefined) {
      return;
    }
    logger.debug(
      `Branching Table (Total Labels ${this.wasmState.br_table.labels.length})`,
    );

    let elements = this.wasmState.br_table.labels.map(
      HexaEncoderSerializeUInt32BE,
    );
    const sizeHeader =
      InspectableState.branchingTableState.length + 2 * 2 + 2 * 2;
    let startTblIdx = 0;
    let endTblIdx = 0;
    while (startTblIdx < this.wasmState.br_table.labels.length) {
      const fit = stateMsgs.howManyFit(sizeHeader, elements);
      if (fit === 0) {
        stateMsgs.forceNewMessage();
        continue;
      }
      endTblIdx = startTblIdx + fit - 1;
      const elems = elements.slice(0, fit).join('');
      const startTblIdxHexa = HexaEncoderSerializeUInt16BE(startTblIdx);
      const endTblIdxHexa = HexaEncoderSerializeUInt16BE(endTblIdx);
      const payload = `${InspectableState.branchingTableState}${startTblIdxHexa}${endTblIdxHexa}${elems}`;
      stateMsgs.addPayload(payload);

      logger.debug(`msg: startTblIdx=${startTblIdx} endTblIdx=${endTblIdx}`);
      startTblIdx = endTblIdx + 1;

      elements = elements.slice(fit, elements.length);
    }
  }

  private serializePC(stateMsgs: HexaStateMessages): void {
    // |  PCState Header | PC
    // |     2 bytes     | serializePointer
    if (this.wasmState.pc === undefined) {
      return;
    }
    const ser = this.serializePointer(this.wasmState.pc);
    logger.debug(`PC=${this.wasmState.pc}`);
    const payload = `${InspectableState.pcState}${ser}`;
    stateMsgs.addPayload(payload);
  }

  private serialiseAllocationMessage(stateMsgs: HexaStateMessages): void {
    if (
      this.wasmState.globals === undefined ||
      this.wasmState.table === undefined ||
      this.wasmState.memory === undefined
    ) {
      throw new Error(
        'cannot serialise Allocaton Message when state is missing',
      );
    }

    logger.debug('Allocation Msgs');

    // Globals

    const gblsAmountHex = HexaEncoderSerializeUInt32BE(
      this.wasmState.globals.length,
    );

    logger.debug(
      `Allocation Msgs - Globals: total=${this.wasmState.globals.length}`,
    );
    const globals = `${InspectableState.globalsState}${gblsAmountHex}`;

    // Table
    const tblInitHex = HexaEncoderSerializeUInt32BE(this.wasmState.table.init);
    const tblMaxHex = HexaEncoderSerializeUInt32BE(this.wasmState.table.max);
    const tblSizeHex = HexaEncoderSerializeUInt32BE(
      this.wasmState.table.elements.length,
    );
    const tbl = `${InspectableState.tableState}${tblInitHex}${tblMaxHex}${tblSizeHex}`;

    logger.debug(
      `Allocation Msgs: Table:  init=${this.wasmState.table.init} max=${this.wasmState.table.max} size=${this.wasmState.table.elements.length}`,
    );
    // Memory
    const memInitHex = HexaEncoderSerializeUInt32BE(this.wasmState.memory.init);
    const memMaxHex = HexaEncoderSerializeUInt32BE(this.wasmState.memory.max);
    const memPagesHex = HexaEncoderSerializeUInt32BE(
      this.wasmState.memory.pages,
    );
    const mem = `${InspectableState.memState}${memMaxHex}${memInitHex}${memPagesHex}`;
    logger.debug(
      `Allocation Msgs: Mem: max=${this.wasmState.memory.max} init=${this.wasmState.memory.init}  pages=${this.wasmState.memory.pages}`,
    );
    const payload = `${globals}${tbl}${mem}`;

    stateMsgs.addPayload(payload);
  }

  private serializePointer(addr: number): string {
    // | Pointer   |
    // | 4*2 bytes |
    return HexaEncoderSerializeUInt32BE(addr);
  }

  static serializeValue(
    val: WASMValueIndexed,
    includeType: boolean = true,
  ): string {
    // |   Type      |       value       |
    // | 1 * 2 bytes |  4*2 or 8*2 bytes |
    let type = -1;
    let v = '';
    let typeStr = '';
    switch (val.type) {
      case WASM.Type.i32:
        if (val.value < 0) {
          v = HexaEncoderSerializeInt32LE(val.value);
        } else {
          v = HexaEncoderSerializeUInt32LE(val.value);
        }
        type = 0;
        typeStr = 'i32';
        break;

      case WASM.Type.i64:
        throw new Error(`unsporrted i64 numbers bigint`);
      // Following code is commented due to the error and should normally be called for bigint
      // v = HexaEncoderSerializeBigUInt64LE(val.value as bigint);
      // type = 1;
      // typeStr = 'i64';
      // break;
      case WASM.Type.f32:
        v = HexaEncoderSerializeFloatLE(val.value);
        type = 2;
        typeStr = 'f32';
        break;
      case WASM.Type.f64:
        v = HexaEncoderSerializeDoubleLE(val.value);
        type = 3;
        typeStr = 'f64';
        break;
      default:
        throw new Error(
          `Got unexisting stack Value type ${val.type} value ${val.value}`,
        );
    }
    logger.debug(`WasmValue: type=${typeStr}(idx ${type}) val=${val.value}`);
    if (includeType) {
      const typeHex = HexaEncoderSerializeUInt8(type);
      return `${typeHex}${v}`;
    } else {
      return v;
    }
  }

  private serializeFrame(frame: WASM.Frame): string {
    // | Frame type | StackPointer | FramePointer |   Return Adress  | FID or Block ID
    // |  1*2 bytes |   4*2bytes   |   4*2bytes   | serializePointer | 4*2bytes or serializePointer

    const validTypes = [
      WASM.FrameType.FUNC,
      WASM.FrameType.INITEXPR,
      WASM.FrameType.BLOCK,
      WASM.FrameType.LOOP,
      WASM.FrameType.IF,
      WASM.FrameType.CALLBACK_GUARD,
      WASM.FrameType.PROXY_GUARD,
    ];

    if (!validTypes.includes(frame.type)) {
      throw new Error(`received unknow frame type ${frame.type}`);
    }
    const type = HexaEncoderSerializeUInt8(frame.type);
    const bigEndian = true;
    const sp = HexaEncoderSerializeInt32(frame.sp, bigEndian);
    const fp = HexaEncoderSerializeInt32(frame.fp, bigEndian);
    const ra = this.serializePointer(frame.ra);
    let rest = '';
    let resStr = ''; // TODO remove
    if (frame.type === WASM.FrameType.FUNC) {
      rest = HexaEncoderSerializeUInt32BE(Number(frame.fidx));
      resStr = `fun_idx=${Number(frame.fidx)}`;
    } else if (
      frame.type === WASM.FrameType.PROXY_GUARD ||
      frame.type === WASM.FrameType.CALLBACK_GUARD
    ) {
      // Nothing has to happen
    } else {
      rest = this.serializePointer(frame.block_key);
      resStr = `block_key=${frame.block_key}`;
    }
    logger.debug(
      `Frame: type=${frame.type} sp=${frame.sp} fp=${frame.fp} ra=${frame.ra} ${resStr}`,
    );
    return `${type}${sp}${fp}${ra}${rest}`;
  }

  private serializeCallbacksMapping(stateMsgs: HexaStateMessages): void {
    // | Mappings type | amountMapings | CallbackMapping |   Return Adress  | FID or Block ID
    // |  1*2 bytes |   4*2bytes   |   4*2bytes   | serializePointer | 4*2bytes or serializePointer
    // callbacks": [{"interrupt_37": [1]}, {"interrupt_39": [2]}]

    if (this.wasmState.callbacks === undefined) {
      return;
    }
    logger.debug(
      `CallbacksMapping (Total Mappings ${this.wasmState.callbacks.length})`,
    );

    let mappings = this.wasmState.callbacks.map((f) => {
      return this.serializeCallbackMapping(f);
    });
    const nrBytesUsedForAmountMappings = 2 * 2;
    const headerSize =
      InspectableState.callbacksState.length + nrBytesUsedForAmountMappings;
    while (mappings.length !== 0) {
      const fit = stateMsgs.howManyFit(headerSize, mappings);
      if (fit === 0) {
        stateMsgs.forceNewMessage();
        continue;
      }
      const amountMappings = HexaEncoderSerializeUInt32BE(fit);
      const fms = mappings.slice(0, fit).join('');
      logger.debug(`amountMappings=${fit}`);
      const payload = `${InspectableState.callbacksState}${amountMappings}${fms}`;
      stateMsgs.addPayload(payload);
      mappings = mappings.slice(fit, mappings.length);
    }
  }

  private serializeCallbackMapping(mapping: WASM.CallbackMapping): string {
    // | size CallbackID | CallbackID | Number TableIndeces | TableIndex | TableIndex | ....
    // |  4 * 2 bytes    |   ....     |   4*2bytes          | 4*2bytes   |
    const sizeCallbackID = HexaEncoderSerializeUInt32BE(
      mapping.callbackid.length,
    );
    const callbackIDInHexa = HexaEncoderSerializeString(mapping.callbackid);
    const tableIndeces = mapping.tableIndexes
      .map((tidx) => HexaEncoderSerializeUInt32BE(tidx))
      .join('');

    logger.warn('TODO check if callbackmapping serialization is correct');
    const tableIndecesSize = HexaEncoderSerializeUInt32BE(tableIndeces.length);
    return `${sizeCallbackID}${callbackIDInHexa}${tableIndecesSize}${tableIndeces}`;
  }

  //   public serializeRFCall(functionId: number, args: StackValue[]): string {
  //     const ignoreType = false;
  //     const fidxHex = HexaEncoderSerializeUInt32BE(functionId);
  //     const argsHex = args
  //       .map((v) => StateBinaryEncoder.serializeValue(v, ignoreType))
  //       .join('');
  //     return `${Instruction.ProxyCall}${fidxHex}${argsHex}`;
  //   }

  //   static serializeStackValueUpdate(value: StackValue): string {
  //     const stackIDx = HexaEncoder.convertToLEB128(value.idx);
  //     const valueHex = HexaEncoder.convertToLEB128(value.value as number);
  //     return `${InterruptTypes.interruptUPDATEStackValue}${stackIDx}${valueHex}`;
  //   }

  //   static serializeGlobalValueUpdate(value: StackValue): string {
  //     const globalIDX = HexaEncoder.convertToLEB128(value.idx);
  //     const valueHex = HexaEncoder.convertToLEB128(value.value as number);
  //     return `${InterruptTypes.interruptUPDATEGlobal}${globalIDX}${valueHex}`;
  //   }
}
