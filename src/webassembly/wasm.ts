import assert from 'assert';
import { LogicalClock } from '../hooks/logicalclock';
import { createLogger } from '../logger/logger';
import { decodeLEB128, hexStringToUint8Array } from '../util/decoder';
import { encodeToHexLEB128, floatToHexString } from '../util/encoder';
import fs from 'fs';

const logger = createLogger('WASM');

export namespace WASM {
  export enum Type {
    f32,
    f64,
    i32,
    i64,
    anyfunc,
    externref,
    asyncfuncError,
    unknown,
  }

  export function typeToString(wasmType: Type): string | undefined {
    switch (wasmType) {
      case Type.f32:
        return 'f32';
      case Type.f64:
        return 'f64';
      case Type.i32:
        return 'i32';
      case Type.i64:
        return 'i64';
      case Type.anyfunc:
        return 'anyfunc';
      case Type.externref:
        return 'externref';
      case Type.asyncfuncError:
        return 'asyncfuncError';
      default:
        return undefined;
    }
  }

  export function typeToNumber(wasmType: Type): number {
    const hex = WASM.typeToHex.get(wasmType);
    if (hex === undefined) {
      throw Error(`Cannot convert unexisting WasmType ${wasmType} to number`);
    }
    const n = parseInt(hex, 16);
    if (isNaN(n)) {
      throw Error(`Cannot convert unexisting WasmType ${wasmType} to number`);
    }
    return n;
  }

  export const typing = new Map<string, Type>([
    ['f32', Type.f32],
    ['f64', Type.f64],
    ['i32', Type.i32],
    ['i64', Type.i64],
    ['anyfunc', Type.anyfunc],
    ['externref', Type.externref],
    ['asyncfuncEror', Type.asyncfuncError],
  ]);

  export const typeToHex = new Map<Type, string>([
    [Type.i32, '7f'],
    [Type.i64, '7e'],
    [Type.f32, '7d'],
    [Type.f64, '7c'],
  ]);

  export const hexToType = new Map<string, Type>([
    ['7f', Type.i32],
    ['7e', Type.i64],
    ['7d', Type.f32],
    ['7c', Type.f64],
  ]);

  export interface Value {
    type: Type;
    value: number;
  }

  export function isWasmValue(obj: any): boolean {
    return (
      typeof obj === 'object' &&
      obj.type !== undefined &&
      typing.get(obj.type) !== undefined &&
      obj.value !== undefined &&
      typeof obj.value === 'number'
    );
  }

  export interface EncodingWasmValueOptions {
    includeType: boolean;
    includeIndex: boolean;
  }

  export function encodeWasmValue(
    value: WASM.Value,
    options: EncodingWasmValueOptions,
  ): string {
    let encodedValue = '';
    if (options.includeType) {
      const hexType = typeToHex.get(value.type);
      if (hexType !== undefined) {
        encodedValue += hexType;
      }
    }
    switch (value.type) {
      case Type.i32:
      case Type.i64:
        encodedValue += encodeToHexLEB128(value.value, true);
        break;
      case Type.f32:
        encodedValue += floatToHexString(value.value);
        break;
      case Type.f64:
        logger.error('encodingWasmValue with unsupported value type F64');
        break;
      default:
        logger.error(`encodingWasmValue with unexisting value type`);
    }
    return encodedValue;
  }

  export function encodeWasmValues(
    values: WASM.Value[],
    options: EncodingWasmValueOptions,
  ): string {
    // nr args LEB 128 | serialize Value | ...
    const sizeHex = WASM.leb128(values.length);
    const argsHex = values
      .map((v) => WASM.encodeWasmValue(v, options))
      .join('');
    return `${sizeHex}${argsHex}`;
  }

  export interface Frame {
    type: number;
    fidx: string;
    sp: number;
    fp: number;
    block_key: number;
    ra: number;
    idx: number;
  }

  export enum FrameType {
    FUNC = 0,
    INITEXPR = 1,
    BLOCK = 2,
    LOOP = 3,
    IF = 4,
    PROXY_GUARD = 254,
    CALLBACK_GUARD = 255,
  }

  export function frameTypeFromNumber(n: number): FrameType | undefined {
    switch (n) {
      case FrameType.FUNC:
        return FrameType.FUNC;
      case FrameType.INITEXPR:
        return FrameType.INITEXPR;
      case FrameType.BLOCK:
        return FrameType.BLOCK;
      case FrameType.LOOP:
        return FrameType.LOOP;
      case FrameType.IF:
        return FrameType.IF;
      case FrameType.PROXY_GUARD:
        return FrameType.PROXY_GUARD;
      case FrameType.CALLBACK_GUARD:
        return FrameType.CALLBACK_GUARD;
      default:
        return undefined;
    }
  }

  export interface Table {
    max: number;
    init: number;
    elements: number[];
  }

  export interface Memory {
    pages: number;
    max: number;
    init: number;
    bytes: Uint8Array;
  }

  export interface CallbackMapping {
    callbackid: string;
    tableIndexes: number[];
  }

  export interface BRTable {
    size: number;
    labels: number[];
  }

  export interface Event {
    topic: string;
    payload: string;
  }

  export function decodeEventFromHexaStr(
    eventHexaStr: string,
  ): undefined | WASM.Event {
    let buffer = hexStringToUint8Array(eventHexaStr);
    if (buffer === undefined) {
      return undefined;
    }

    const decodingSizeTopic = decodeLEB128(buffer);
    if (decodingSizeTopic === undefined) {
      return undefined;
    }
    const topicBuffer = buffer.slice(
      decodingSizeTopic.bytesRead,
      decodingSizeTopic.bytesRead + decodingSizeTopic.value,
    );

    const decoder = new TextDecoder('ascii');
    const topic = decoder.decode(topicBuffer);

    buffer = buffer.slice(
      decodingSizeTopic.bytesRead + decodingSizeTopic.value,
    );
    const decodingSizePayload = decodeLEB128(buffer);
    if (decodingSizePayload === undefined) {
      return undefined;
    }
    const payloadBuffer = buffer.slice(
      decodingSizePayload.bytesRead,
      decodingSizePayload.bytesRead + decodingSizePayload.value,
    );
    const payload = decoder.decode(payloadBuffer);

    return {
      topic,
      payload,
    };
  }

  export function interruptTopicToPinNumber(topic: string): number {
    // e.g, topic="interrupt_33"
    const pin = interruptTopicToPinNumberIfPossible(topic);
    assert(pin !== undefined);
    return pin;
  }

  export function interruptTopicToPinNumberIfPossible(
    topic: string,
  ): number | undefined {
    // e.g, topic="interrupt_33"
    const vals = topic.split('_');
    if (vals.length !== 2) {
      return undefined;
    }
    const [, pinStr] = vals;
    const pin = Number(pinStr);
    if (isNaN(pin)) {
      return undefined;
    }
    return pin;
  }

  export function leb128(a: number): string {
    // TODO can only handle 32 bit
    a |= 0;
    const result = [];
    while (true) {
      const byte_ = a & 0x7f;
      a >>= 7;
      if (
        (a === 0 && (byte_ & 0x40) === 0) ||
        (a === -1 && (byte_ & 0x40) !== 0)
      ) {
        result.push(byte_.toString(16).padStart(2, '0'));
        return result.join('').toUpperCase();
      }
      result.push((byte_ | 0x80).toString(16).padStart(2, '0'));
    }
  }
}

export interface WASMValueIndexed extends WASM.Value {
  idx: number;
}

export interface WasmStateArgs {
  pc?: number;
  breakpoints?: number[];
  stack?: WASMValueIndexed[];
  callstack?: WASM.Frame[];
  globals?: WASMValueIndexed[];
  table?: WASM.Table;
  memory?: WASM.Memory;
  br_table?: WASM.BRTable;
  callbacks?: WASM.CallbackMapping[];
  events?: WASM.Event[];
}

function parseWasmValueIndex(sv: any): WASMValueIndexed {
  if (typeof sv !== 'object') {
    throw new Error(`Stack value type expected to be a string`);
  }
  if (typeof sv.idx !== 'number') {
    throw new Error(`Stack value idx is expected to be a number`);
  }

  if (typeof sv.type !== 'string') {
    throw new Error(`Stack value type expected to be a string`);
  }

  const t = WASM.typing.get(sv.type.toLowerCase());
  if (t === undefined) {
    throw new Error(`Stack value type received inexisting type ${sv.type}`);
  }
  const v = sv.value;
  if (typeof v !== 'number') {
    throw new Error(`Stack value expected to be a number got ${v}`);
  }
  return {
    idx: sv.idx,
    type: t,
    value: v,
  };
}

function parseHeapFree(v: any): number {
  if (typeof v !== 'object') {
    throw new Error(`heap usage should be an object`);
  }

  const u = v.used;
  if (u === undefined) {
    throw new Error(`'used' field of heap usage is missing`);
  }

  const used = Number(u);
  if (isNaN(used)) {
    throw new Error(`'used' value is not a number given ${used}`);
  }

  return used;
}

export class WasmState {
  pc?: number;
  breakpoints?: number[];
  stack?: WASMValueIndexed[];
  callstack?: WASM.Frame[];
  globals?: WASMValueIndexed[];
  table?: WASM.Table;
  memory?: WASM.Memory;
  br_table?: WASM.BRTable;
  callbacks?: WASM.CallbackMapping[];
  events?: WASM.Event[];
  exception?: string;
  logicalClock?: LogicalClock;
  heapFree?: number;

  private readonly _jsonString?: string;

  constructor(args: any, jsonString?: string) {
    // TODO change to WasmStateArgs and fix mismatch types
    this._jsonString = jsonString;

    if (args.pc !== undefined) {
      this.pc = args.pc;
    }
    if (args.breakpoints !== undefined) {
      this.breakpoints = args.breakpoints;
    }
    if (args.stack !== undefined) {
      this.stack = args.stack.map(parseWasmValueIndex);
    }

    if (args.globals !== undefined) {
      this.globals = args.globals.map(parseWasmValueIndex);
    }

    if (args.callstack !== undefined) {
      this.callstack = args.callstack;
    }
    if (args.table !== undefined) {
      if (isNaN(args.table.max)) {
        throw new Error(`Table max isNaN ${args.table.max}`);
      }

      if (isNaN(args.table.init)) {
        throw new Error(`Table init isNaN ${args.table.init}`);
      }
      this.table = {
        max: args.table.max,
        init: args.table.init,
        elements: args.table.elements.map((v: any) => {
          if (isNaN(v)) {
            throw new Error(`Table element isNaN ${v}`);
          }
          return v;
        }),
      };
    }
    if (args.memory !== undefined) {
      if (isNaN(args.memory.pages)) {
        throw new Error(`Memory pages isNaN ${args.memory.pages}`);
      }
      if (isNaN(args.memory.max)) {
        throw new Error(`Memory max isNaN ${args.memory.max}`);
      }
      if (isNaN(args.memory.init)) {
        throw new Error(`Memory init isNaN ${args.memory.init}`);
      }
      const memBytes = Uint8Array.from(args.memory.bytes);
      if (memBytes === undefined) {
        throw new Error(
          `Memory bytes are invalid ${args.memory.bytes.toString()}`,
        );
      }
      this.memory = {
        pages: args.memory.pages,
        max: args.memory.max,
        init: args.memory.init,
        bytes: memBytes,
      };
    }
    if (args.br_table !== undefined) {
      const brTableSize = parseInt(args.br_table.size, 16);
      if (isNaN(brTableSize)) {
        throw new Error(`Invalid BR_table size ${args.br_table.size}`);
      }
      this.br_table = {
        size: brTableSize,
        labels: args.br_table.labels.map((v: any) => {
          if (isNaN(v)) {
            throw new Error(`Invalid BR_table label is NaN ${v}`);
          }
          return v;
        }),
      };
    }
    if (args.callbacks !== undefined) {
      this.callbacks = args.callbacks.map((cb: any) => {
        if (typeof cb.callbackid !== 'string') {
          throw new Error(
            `Callback id is expected to be a string give an id of type${typeof cb.callbackid_}`,
          );
        } else if (cb.callbackID === '') {
          throw new Error('Callback id should not be an empty string');
        }
        return {
          callbackid: cb.callbackid,
          tableIndexes: cb.tableIndexes.map((i: any) => {
            if (isNaN(i)) {
              throw new Error(`Callback index is NaN ${i}`);
            }
            return i;
          }),
        };
      });
    }
    if (args.events !== undefined) {
      this.events = args.events.map((ev: any) => {
        if (typeof ev.topic !== 'string') {
          throw new Error(`event topic should be string got ${ev.topic}`);
        }

        if (typeof ev.payload !== 'string') {
          throw new Error(`event topic should be string got ${ev.topic}`);
        }
        return {
          topic: ev.topic,
          payload: ev.payload,
        };
      });
    }

    if (args.exception !== undefined) {
      if (typeof args.exception !== 'string') {
        throw new Error(
          `Exception should be a string got ${typeof args.exception}`,
        );
      }
      this.exception = args.exception;
    }

    if (args.clock !== undefined) {
      if (typeof args.clock !== 'object') {
        throw new Error(
          `LogicalClock should be an object got ${typeof args.clock}`,
        );
      }
      const nrOfInstructions = args.clock.i;
      if (typeof nrOfInstructions !== 'number') {
        throw new Error(
          `LogicalClock nr of instructions should be a number got ${nrOfInstructions}`,
        );
      }
      const nrOfEvents = args.clock.e;
      if (typeof nrOfEvents !== 'number') {
        throw new Error(
          `LogicalClock nr of events should be a number got ${nrOfEvents}`,
        );
      }

      this.logicalClock = {
        nrOfInstructions,
        nrOfEvents,
      };
    }

    if (args.heap !== undefined) {
      this.heapFree = parseHeapFree(args.heap);
    }
  }

  get callbackMappings(): WASM.CallbackMapping[] {
    if (this.callbacks === undefined) {
      return [];
    }
    return this.callbacks;
  }

  isSnapshot(): boolean {
    return (
      this.pc !== undefined &&
      this.breakpoints !== undefined &&
      this.stack !== undefined &&
      this.callstack !== undefined &&
      this.globals !== undefined &&
      this.table !== undefined &&
      this.memory !== undefined &&
      this.br_table !== undefined &&
      this.callbacks !== undefined &&
      this.events !== undefined &&
      this.heapFree !== undefined
    );
  }

  asJSONString(): string {
    if (this._jsonString === undefined) {
      throw new Error('no jsonstring provided');
    }
    return this._jsonString;
  }
}

export async function storeWasmStateToFile(
  wasmState: WasmState,
  destPath: string,
): Promise<void> {
  fs.writeFileSync(destPath, wasmState.asJSONString());
}
