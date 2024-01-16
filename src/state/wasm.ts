import { createLogger } from '../logger/logger';
import { encodeToHexLEB128, floatToHexString } from '../util/encoder';

const logger = createLogger('WASM');

export namespace WASM {
  export enum Type {
    f32,
    f64,
    i32,
    i64,
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
  ]);

  export const typeToHex = new Map<Type, string>([
    [Type.i32, '7f'],
    [Type.i64, '7e'],
    [Type.f32, '7d'],
    [Type.f64, '7c'],
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
        encodedValue += encodeToHexLEB128(value.value);
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
    return (
      WASM.leb128(values.length) +
      values.map((v) => WASM.encodeWasmValue(v, options)).join('')
    );
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
      this.stack = args.stack.map(
        (sv: { idx: number; type: string; value: number }) => {
          return {
            idx: sv.idx,
            type: WASM.typing.get(sv.type),
            value: sv.value,
          };
        },
      );
    }

    if (args.globals !== undefined) {
      this.globals = args.globals.map(
        (gv: { idx: number; type: string; value: number }) => {
          return {
            idx: gv.idx,
            type: WASM.typing.get(gv.type),
            value: gv.value,
          };
        },
      );
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
        if (isNaN(cb.callbackid)) {
          throw new Error(`Callback id is NaN ${cb.callbackid}`);
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
  }

  asJSONString(): string {
    if (this._jsonString === undefined) {
      throw new Error('no jsonstring provided');
    }
    return this._jsonString;
  }
}
