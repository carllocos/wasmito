import { getGlobalLogger } from '../logger/logger';
import { encodeLEB128ToHex, floatToHexString } from '../util/encoder';

export namespace WASM {
  export enum Type {
    f32,
    f64,
    i32,
    i64,
    unknown,
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

  export interface EncodingWasmValueOptions {
    includeType: boolean;
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
        encodedValue += encodeLEB128ToHex(value.value);
        break;
      case Type.f32:
        encodedValue += floatToHexString(value.value);
        break;
      case Type.f64:
        getGlobalLogger().error(`encodingWasmValue with unexisting value type`);
        break;
      default:
        getGlobalLogger().error(`encodingWasmValue with unexisting value type`);
    }
    return encodedValue;
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
