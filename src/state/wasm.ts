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
export interface WasmState {
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
